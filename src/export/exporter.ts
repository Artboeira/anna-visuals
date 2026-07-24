import { saveAs } from 'file-saver';
import { renderEngine } from '../engine/RenderEngine';
import { useShowStore } from '../store/showStore';

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

export type ExportTarget = 'slice' | 'comp' | 'internal';

export const EXPORT_TARGETS: { id: ExportTarget; label: string; hint: string }[] = [
  { id: 'slice', label: 'Slice 6200×512', hint: 'faixa que o slice "Panel" lê — coloque num layer cobrindo o rodapé da composição' },
  { id: 'comp', label: 'Comp 6200×4600', hint: 'composição inteira, faixa já posicionada (y 4088) e teto preto' },
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
    return { stripW: panel.w, stripH: panel.h, outW: panel.w, outH: panel.h, stripX: 0, stripY: 0 };
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

// ───────────────────────────────────────────────────────── vídeo ──

export interface RecordingController {
  /** resolve quando o arquivo foi baixado */
  done: Promise<void>;
  stop: () => void;
  mimeType: string;
}

export interface RecordOptions {
  target: ExportTarget;
  durationSec: number;
  fps: 30 | 60;
  onProgress?: (elapsedSec: number) => void;
}

function pickMimeType(width: number): string {
  // H.264 estoura o limite de nível/encoder acima de ~4096 px de largura —
  // nesses casos vai direto de VP9 (WebM). Converta para DXV no Resolume
  // Alley ou via ffmpeg se precisarem de codec nativo.
  const candidates =
    width <= 4032
      ? ['video/mp4;codecs=avc1.640033', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
      : ['video/webm;codecs=vp9', 'video/webm'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

export function startRecording(opts: RecordOptions): RecordingController {
  const layout = layoutFor(opts.target);
  const mimeType = pickMimeType(layout.outW);
  if (!mimeType) throw new Error('Este navegador não suporta gravação de vídeo (MediaRecorder)');

  let stopped = false;
  let stopRequested = false;
  const requestStop = () => {
    stopRequested = true;
  };

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
    while (!stopRequested) {
      await nextFrame();
      composeFrame(ctx, layout);
      const elapsed = (performance.now() - t0) / 1000;
      opts.onProgress?.(elapsed);
      if (elapsed >= opts.durationSec) break;
    }

    recorder.stop();
    await finished;
    stopped = true;

    const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type: mimeType });
    saveAs(
      blob,
      `anna-led_${sceneSlug()}_${layout.outW}x${layout.outH}_${Math.round(
        Math.min(opts.durationSec, (performance.now() - t0) / 1000),
      )}s.${ext}`,
    );
  });

  return {
    done: done.then(() => {
      void stopped;
    }),
    stop: requestStop,
    mimeType,
  };
}
