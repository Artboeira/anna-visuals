import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

/**
 * Export MP4/H.264 de alta qualidade via WebCodecs — supera os limites do
 * MediaRecorder (H.264 até ~4032 px de largura, bitrate baixo).
 *
 * H.264 High Level 5.2 comporta o slice oficial 6200×512 por frame-size
 * (388×32 macroblocos = 12.416 MBs < 36.864 do nível). O encoder de
 * hardware costuma travar em 4096 px de largura — por isso o probe também
 * tenta 'prefer-software'. Se nenhum config for aceito, o exporter cai no
 * caminho MediaRecorder/WebM.
 */

export interface MP4Support {
  codec: string;
  hardwareAcceleration: 'no-preference' | 'prefer-software';
}

function bitrateFor(width: number, height: number, fps: number): number {
  // ~0,2 bit/pixel/frame — alta qualidade para conteúdo de LED (áreas chapadas)
  return Math.min(120_000_000, Math.max(12_000_000, Math.round(width * height * fps * 0.2)));
}

/** Primeiro config H.264 aceito pelo navegador para o tamanho pedido, ou null. */
export async function probeMP4Support(
  width: number,
  height: number,
  fps: number,
): Promise<MP4Support | null> {
  if (typeof VideoEncoder === 'undefined') return null;
  // High Profile: L5.2 (0x34) cobre 6200×512; L5.1 (0x33) como alternativa
  const codecs = ['avc1.640034', 'avc1.640033'];
  const accels: MP4Support['hardwareAcceleration'][] = ['no-preference', 'prefer-software'];
  for (const codec of codecs) {
    for (const hardwareAcceleration of accels) {
      try {
        const { supported } = await VideoEncoder.isConfigSupported({
          codec,
          width,
          height,
          framerate: fps,
          bitrate: bitrateFor(width, height, fps),
          hardwareAcceleration,
          avc: { format: 'avc' },
        });
        if (supported) return { codec, hardwareAcceleration };
      } catch {
        /* config inválido neste navegador — tenta o próximo */
      }
    }
  }
  return null;
}

export interface MP4RecordOptions {
  width: number;
  height: number;
  fps: 30 | 60;
  durationSec: number;
  support: MP4Support;
  /** compõe o frame corrente no contexto do canvas gravado */
  drawFrame: (ctx: CanvasRenderingContext2D) => void;
  onProgress?: (elapsedSec: number) => void;
  isStopRequested: () => boolean;
}

/**
 * Grava em tempo real (mesmo padrão do caminho MediaRecorder: o loop
 * principal do app segue alimentando o engine; aqui só se copia o frame
 * e alimenta o encoder com pacing para o fps escolhido).
 */
export async function recordMP4(opts: MP4RecordOptions): Promise<Blob> {
  const { width, height, fps, durationSec, support } = opts;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width, height },
    fastStart: 'in-memory',
  });

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encoderError = e instanceof Error ? e : new Error(String(e));
    },
  });
  encoder.configure({
    codec: support.codec,
    width,
    height,
    framerate: fps,
    bitrate: bitrateFor(width, height, fps),
    hardwareAcceleration: support.hardwareAcceleration,
    avc: { format: 'avc' },
  });

  const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
  const frameDurUs = 1e6 / fps;
  const totalFrames = Math.round(durationSec * fps);
  let frameIndex = 0;
  const t0 = performance.now();

  try {
    while (frameIndex < totalFrames && !opts.isStopRequested()) {
      await nextFrame();
      if (encoderError) throw encoderError;
      const elapsed = (performance.now() - t0) / 1000;
      opts.onProgress?.(elapsed);
      // pacing: só captura quando o relógio alcança o próximo frame do vídeo
      if (elapsed < frameIndex / fps) continue;
      // backpressure: encoder atolado → pula este tick do rAF
      if (encoder.encodeQueueSize > 8) continue;

      opts.drawFrame(ctx);
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round(frameIndex * frameDurUs),
        duration: Math.round(frameDurUs),
      });
      encoder.encode(frame, { keyFrame: frameIndex % (fps * 2) === 0 });
      frame.close();
      frameIndex++;
    }

    if (frameIndex === 0) throw new Error('Nenhum frame capturado');
    await encoder.flush();
    if (encoderError) throw encoderError;
    muxer.finalize();
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }

  return new Blob([target.buffer], { type: 'video/mp4' });
}
