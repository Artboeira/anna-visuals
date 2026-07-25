import { saveAs } from 'file-saver';
import { renderEngine } from '../engine/RenderEngine';
import { useShowStore } from '../store/showStore';
import { buildCobogoGrid } from '../grid/cobogoGrid';
import { recordMP4, probeMP4Support } from './mp4Encoder';

/**
 * Exportação de imagem/vídeo para teste no Resolume.
 *
 * Mapa oficial (refs/Ame_withpanel.xml — Resolume Arena 7):
 *   composição 6200×4600; o screen "Panel" tem um slice cujo InputRect lê
 *   x 0–6200, y 4088–4600 → a faixa do painel é 6200×512 no rodapé.
 *   O restante da composição alimenta os lumiverses DMX do teto — por isso
 *   a exportação "composição inteira" preenche o resto com preto real
 *   (aqui preto é correto: teto apagado durante o teste do painel).
 *
 * O render é pixel-true: a resolução interna do engine é trocada para o
 * alvo durante a exportação (as cenas são resolution-independent e a grade
 * do cobogó é re-gerada) e restaurada ao final.
 */

export const RESOLUME_MAP = {
  compW: 6200,
  compH: 4600,
  panel: { x: 0, y: 4088, w: 6200, h: 512 },
} as const;

/**
 * Resolução oficial do painel, conferida no Resolume do próprio painel de
 * LED em 2026-07-25 — substitui o slice 6200×512 do XML antigo como alvo
 * principal de export.
 */
export const PANEL_OUT = { w: 6400, h: 768 } as const;

export type ExportTarget = 'slice' | 'comp' | 'internal';

export const EXPORT_TARGETS: { id: ExportTarget; label: string; hint: string }[] = [
  { id: 'slice', label: 'Painel 6400×768', hint: 'resolução oficial do painel (conferida no Resolume do LED) — arquivo pronto para o layer/slice' },
  { id: 'comp', label: 'Comp 6200×4600 (XML antigo)', hint: 'composição do refs/Ame_withpanel.xml, faixa 6200×512 já posicionada (y 4088) e teto preto' },
  { id: 'internal', label: 'Resolução atual', hint: 'a resolução interna configurada acima' },
];

interface TargetLayout {
  /** resolução em que o engine renderiza a faixa */
  stripW: number;
  stripH: number;
  /** tamanho final do arquivo exportado */
  outW: number;
  outH: number;
  /** posição da faixa dentro do arquivo final */
  stripX: number;
  stripY: number;
}

function layoutFor(target: ExportTarget): TargetLayout {
  const { compW, compH, panel } = RESOLUME_MAP;
  if (target === 'comp') {
    return { stripW: panel.w, stripH: panel.h, outW: compW, outH: compH, stripX: panel.x, stripY: panel.y };
  }
  if (target === 'slice') {
    return { stripW: PANEL_OUT.w, stripH: PANEL_OUT.h, outW: PANEL_OUT.w, outH: PANEL_OUT.h, stripX: 0, stripY: 0 };
  }
  const { internalWidth, internalHeight } = useShowStore.getState().output;
  return { stripW: internalWidth, stripH: internalHeight, outW: internalWidth, outH: internalHeight, stripX: 0, stripY: 0 };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function settleFrames(n: number): Promise<void> {
  for (let i = 0; i < n; i++) await nextFrame();
}

function stamp(): string {
  const d = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function sceneSlug(): string {
  return useShowStore.getState().sceneId;
}

/** Troca a resolução interna para o alvo, roda fn, restaura. */
async function withStripResolution<T>(stripW: number, stripH: number, fn: () => Promise<T>): Promise<T> {
  const st = useShowStore.getState();
  const prev = { internalWidth: st.output.internalWidth, internalHeight: st.output.internalHeight };
  const changed = prev.internalWidth !== stripW || prev.internalHeight !== stripH;
  if (changed) {
    st.setOutput({ internalWidth: stripW, internalHeight: stripH });
    await settleFrames(3); // engine re-cria buffers/grade e renderiza no novo tamanho
  }
  try {
    return await fn();
  } finally {
    if (changed) {
      useShowStore.getState().setOutput(prev);
    }
  }
}

function composeFrame(
  ctx: CanvasRenderingContext2D,
  layout: TargetLayout,
): void {
  if (layout.outW !== layout.stripW || layout.outH !== layout.stripH) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, layout.outW, layout.outH);
  }
  ctx.drawImage(renderEngine.getCanvas(), layout.stripX, layout.stripY, layout.stripW, layout.stripH);
}

// ─────────────────────────────────────────────────────────── PNG ──

export async function exportPNG(target: ExportTarget): Promise<void> {
  const layout = layoutFor(target);
  await withStripResolution(layout.stripW, layout.stripH, async () => {
    const canvas = document.createElement('canvas');
    canvas.width = layout.outW;
    canvas.height = layout.outH;
    composeFrame(canvas.getContext('2d')!, layout);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Falha ao gerar o PNG');
    saveAs(blob, `anna-led_${sceneSlug()}_${layout.outW}x${layout.outH}_${stamp()}.png`);
  });
}

/**
 * Máscara P&B para mapping: branco = furos (LED visível), preto = cenografia.
 * Segue a calibração atual da aba GRADE (incluindo o modo quadradinhos/
 * silhueta). Não passa pelo engine — a grade é gerada direto na resolução
 * do alvo, então nada muda no que está no ar.
 */
export async function exportMaskPNG(target: ExportTarget): Promise<void> {
  const layout = layoutFor(target);
  const canvas = document.createElement('canvas');
  canvas.width = layout.outW;
  canvas.height = layout.outH;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, layout.outW, layout.outH);

  const grid = buildCobogoGrid(useShowStore.getState().gridParams, layout.stripW, layout.stripH);
  ctx.save();
  ctx.translate(layout.stripX, layout.stripY);
  ctx.fillStyle = '#fff';
  for (const cell of grid.cells) {
    ctx.fill(cell.path);
  }
  ctx.restore();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Falha ao gerar a máscara PNG');
  saveAs(blob, `anna-led_mascara_${layout.outW}x${layout.outH}_${stamp()}.png`);
}

// ───────────────────────────────────────────────────────── vídeo ──

export interface RecordingController {
  /** resolve quando o arquivo foi baixado */
  done: Promise<void>;
  stop: () => void;
  /** descrição do codec real em uso, para a UI */
  label: string;
}

export interface RecordOptions {
  target: ExportTarget;
  durationSec: number;
  fps: 30 | 60;
  onProgress?: (elapsedSec: number) => void;
}

function videoFilename(layout: TargetLayout, seconds: number, ext: string): string {
  return `anna-led_${sceneSlug()}_${layout.outW}x${layout.outH}_${Math.round(seconds)}s.${ext}`;
}

/**
 * Caminho preferencial: WebCodecs + mp4-muxer → MP4/H.264 de alta qualidade
 * em qualquer tamanho que o encoder aceitar (inclusive o slice 6200×512).
 * Fallback: MediaRecorder WebM/VP9 (converter no Resolume Alley ou ffmpeg).
 */
export async function startRecording(opts: RecordOptions): Promise<RecordingController> {
  const layout = layoutFor(opts.target);
  const support = await probeMP4Support(layout.outW, layout.outH, opts.fps);

  let stopRequested = false;
  const requestStop = () => {
    stopRequested = true;
  };

  if (support) {
    const done = withStripResolution(layout.stripW, layout.stripH, async () => {
      const t0 = performance.now();
      const blob = await recordMP4({
        width: layout.outW,
        height: layout.outH,
        fps: opts.fps,
        durationSec: opts.durationSec,
        support,
        drawFrame: (ctx) => composeFrame(ctx, layout),
        onProgress: opts.onProgress,
        isStopRequested: () => stopRequested,
      });
      saveAs(blob, videoFilename(layout, Math.min(opts.durationSec, (performance.now() - t0) / 1000), 'mp4'));
    });
    return { done, stop: requestStop, label: 'MP4/H.264' };
  }

  return startRecordingMediaRecorder(opts, layout, requestStop, () => stopRequested);
}

function pickMimeType(): string {
  const candidates = ['video/webm;codecs=vp9', 'video/webm'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

function startRecordingMediaRecorder(
  opts: RecordOptions,
  layout: TargetLayout,
  requestStop: () => void,
  isStopRequested: () => boolean,
): RecordingController {
  const mimeType = pickMimeType();
  if (!mimeType) throw new Error('Este navegador não suporta gravação de vídeo');

  const done = withStripResolution(layout.stripW, layout.stripH, async () => {
    const canvas = document.createElement('canvas');
    canvas.width = layout.outW;
    canvas.height = layout.outH;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(opts.fps);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: Math.min(80_000_000, Math.round(layout.outW * layout.outH * opts.fps * 0.12)),
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const finished = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start(1000);
    const t0 = performance.now();

    // Loop de composição: copia o frame do engine para o canvas gravado.
    // O loop principal do app segue rodando e alimentando o engine.
    while (!isStopRequested()) {
      await nextFrame();
      composeFrame(ctx, layout);
      const elapsed = (performance.now() - t0) / 1000;
      opts.onProgress?.(elapsed);
      if (elapsed >= opts.durationSec) break;
    }

    recorder.stop();
    await finished;

    const blob = new Blob(chunks, { type: mimeType });
    saveAs(
      blob,
      videoFilename(layout, Math.min(opts.durationSec, (performance.now() - t0) / 1000), 'webm'),
    );
  });

  return {
    done,
    stop: requestStop,
    label: 'WebM/VP9 — H.264 indisponível neste tamanho',
  };
}
