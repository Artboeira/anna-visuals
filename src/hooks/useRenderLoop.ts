import { useEffect, useRef } from 'react';
import { renderEngine } from '../engine/RenderEngine';
import { useShowStore } from '../store/showStore';

/**
 * Loop rAF único do app: renderiza o motor e entrega o frame para quem
 * exibe (PreviewStage). Substitui o host p5 do gradient_system.
 * Respeita o fps alvo (30 pula frames alternados).
 */
export function useRenderLoop(onFrame: (canvas: HTMLCanvasElement) => void): void {
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    let raf = 0;
    let lastDraw = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const { fps } = useShowStore.getState().output;
      const minInterval = fps === 30 ? 1000 / 30 - 2 : 0;
      if (now - lastDraw < minInterval) return;
      lastDraw = now;
      renderEngine.render(now);
      onFrameRef.current(renderEngine.getCanvas());
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}
