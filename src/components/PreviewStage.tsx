import { useEffect, useRef, useState } from 'react';
import { useShowStore } from '../store/showStore';
import { renderEngine } from '../engine/RenderEngine';
import { getMaskOverlay } from '../grid/maskOverlay';
import { useRenderLoop } from '../hooks/useRenderLoop';
import s from './PreviewStage.module.css';

/**
 * Palco do preview: canvas de exibição com letterbox 10:1.
 * Camadas: frame do LED → simulação do cobogó → ghost de calibração.
 * Em modo apresentação: só o frame, full-bleed (é o que o Electron captura).
 *
 * Recorte do ghost: a faixa do painel dentro do LED_LAYOUT.jpeg
 * (frações medidas na imagem de referência 1600×900).
 */
const GHOST_CROP = { sx: 0.025, sy: 0.518, sw: 0.95, sh: 0.168 };

export function PreviewStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ghostImgRef = useRef<HTMLImageElement | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [fps, setFps] = useState(0);
  const fpsCounter = useRef({ frames: 0, last: 0 });

  const presentation = useShowStore((st) => st.ui.presentation);
  const clean = useShowStore((st) => st.ui.clean);
  const showMask = useShowStore((st) => st.ui.showMask);

  // Em modo apresentação o canvas segue a JANELA (dpr real): o frame capturado
  // pelo Electron sai pixel-perfect quando a janela casa com o pixel map.
  useEffect(() => {
    const onResize = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Ghost image carregada uma vez
  useEffect(() => {
    const img = new Image();
    img.src = './refs/led_layout.jpeg';
    img.onload = () => {
      ghostImgRef.current = img;
    };
  }, []);

  // Mede o container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setContainerSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useRenderLoop((internal) => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const ctx = canvas.getContext('2d')!;
    const st = useShowStore.getState();

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(internal, 0, 0, canvas.width, canvas.height);

    if (!st.ui.presentation && st.ui.showMask) {
      const mask = getMaskOverlay(renderEngine.getGrid());
      ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
    }

    if (!st.ui.presentation && st.ui.ghost && ghostImgRef.current) {
      const img = ghostImgRef.current;
      ctx.globalAlpha = st.ui.ghostAlpha;
      ctx.drawImage(
        img,
        GHOST_CROP.sx * img.naturalWidth,
        GHOST_CROP.sy * img.naturalHeight,
        GHOST_CROP.sw * img.naturalWidth,
        GHOST_CROP.sh * img.naturalHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      ctx.globalAlpha = 1;
    }

    // FPS
    const now = performance.now();
    const c = fpsCounter.current;
    c.frames += 1;
    if (now - c.last > 1000) {
      setFps(c.frames);
      c.frames = 0;
      c.last = now;
    }
  });

  // Letterbox 10:1 dentro do container (modo edição)
  const aspect = useShowStore((st) => st.output.internalWidth / st.output.internalHeight);
  let dispW = containerSize.w;
  let dispH = Math.round(dispW / aspect);
  if (dispH > containerSize.h) {
    dispH = containerSize.h;
    dispW = Math.round(dispH * aspect);
  }
  // Resolução do canvas de exibição: 2x para nitidez em telas retina
  const pxW = Math.max(1, dispW * 2);
  const pxH = Math.max(1, dispH * 2);

  if (presentation) {
    const dpr = window.devicePixelRatio || 1;
    return (
      <div className={s.presentation}>
        <canvas
          ref={canvasRef}
          width={Math.max(1, Math.round(winSize.w * dpr))}
          height={Math.max(1, Math.round(winSize.h * dpr))}
          className={s.presentationCanvas}
        />
      </div>
    );
  }

  // Modo palco (P): preview limpo em tela cheia — letterbox 10:1, cobogó
  // aplicado, sem painel nem metadados. Esc/P volta para a edição.
  return (
    <div ref={containerRef} className={clean ? s.containerClean : s.container}>
      <div className={clean ? s.frameClean : s.frame} style={{ width: dispW, height: dispH }}>
        <canvas ref={canvasRef} width={pxW} height={pxH} className={s.canvas} />
      </div>
      {!clean && (
        <div className={s.meta}>
          <span>
            {useShowStore.getState().output.internalWidth} × {useShowStore.getState().output.internalHeight} px
            — 27,00 × 2,70 m
          </span>
          <span>{fps} fps {showMask ? '· cobogó' : ''}</span>
        </div>
      )}
    </div>
  );
}
