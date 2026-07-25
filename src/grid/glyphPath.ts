import type { GlyphParams } from './types';

/**
 * Geometria das duas células do cobogó, construída em coordenadas absolutas
 * do canvas (centro cx,cy e tamanho útil w,h já resolvidos pelo cobogoGrid).
 *
 * Octógono: quadrado com chanfro paramétrico (cut 0 = quadrado, 0.5 = losango).
 *
 * Glifo: símbolo oficial ANNA 2026, transcrito do SVG
 * refs/ANNA LOGO 2026_SYMBOL BLACK.svg (viewBox 427.21 × 409.9):
 *   - barra esquerda  x 103.92–182.85, altura total, topo-direito arredondado
 *   - barra direita   x 237.15–316.08, altura total, topo-esquerdo arredondado
 *   - dois losangos (quadrados 58.05 rotacionados 45°) centrados em
 *     (41.05, 363.98) e (386.17, 363.98) — na base, por fora das barras
 */

/** Quadradinho centrado — modo cellShape 'quadrado'. */
export function buildSquarePath(cx: number, cy: number, w: number, h: number): Path2D {
  const p = new Path2D();
  p.rect(cx - w / 2, cy - h / 2, w, h);
  return p;
}

export function buildOctagonPath(cx: number, cy: number, w: number, h: number, cut: number): Path2D {
  const p = new Path2D();
  const hw = w / 2;
  const hh = h / 2;
  const cw = hw * 2 * Math.min(0.5, Math.max(0, cut)); // corte em px (eixo x)
  const ch = hh * 2 * Math.min(0.5, Math.max(0, cut));

  p.moveTo(cx - hw + cw, cy - hh);
  p.lineTo(cx + hw - cw, cy - hh);
  p.lineTo(cx + hw, cy - hh + ch);
  p.lineTo(cx + hw, cy + hh - ch);
  p.lineTo(cx + hw - cw, cy + hh);
  p.lineTo(cx - hw + cw, cy + hh);
  p.lineTo(cx - hw, cy + hh - ch);
  p.lineTo(cx - hw, cy - hh + ch);
  p.closePath();
  return p;
}

/** viewBox do SVG oficial */
const LOGO_W = 427.21;
const LOGO_H = 409.9;
/** meia-diagonal dos losangos: lado 58.05 rotacionado 45° */
const DIAMOND_HALF = 58.05 * Math.SQRT1_2;

function diamond(p: Path2D, cx: number, cy: number, half: number): void {
  p.moveTo(cx, cy - half);
  p.lineTo(cx + half, cy);
  p.lineTo(cx, cy + half);
  p.lineTo(cx - half, cy);
  p.closePath();
}

export function buildGlyphPath(
  cx: number,
  cy: number,
  w: number,
  h: number,
  g: GlyphParams,
): Path2D {
  // Escala uniforme para o símbolo caber na área útil da célula
  const s = Math.min(w / LOGO_W, h / LOGO_H) * g.scale;
  const ox = cx - (LOGO_W * s) / 2;
  const oy = cy - (LOGO_H * s) / 2 + h * g.offsetY;
  const X = (x: number) => ox + x * s;
  const Y = (y: number) => oy + y * s;

  const p = new Path2D();

  // Barra esquerda — topo-direito arredondado
  // SVG: M103.92,0 v409.9 h78.93 V78.93 C182.85,35.34 147.51,0 103.92,0 Z
  p.moveTo(X(103.92), Y(0));
  p.lineTo(X(103.92), Y(409.9));
  p.lineTo(X(182.85), Y(409.9));
  p.lineTo(X(182.85), Y(78.93));
  p.bezierCurveTo(X(182.85), Y(35.34), X(147.51), Y(0), X(103.92), Y(0));
  p.closePath();

  // Barra direita — topo-esquerdo arredondado
  // SVG: M237.15,78.93 v330.97 h78.93 V0 C272.49,0 237.15,35.34 237.15,78.93
  p.moveTo(X(237.15), Y(78.93));
  p.lineTo(X(237.15), Y(409.9));
  p.lineTo(X(316.08), Y(409.9));
  p.lineTo(X(316.08), Y(0));
  p.bezierCurveTo(X(272.49), Y(0), X(237.15), Y(35.34), X(237.15), Y(78.93));
  p.closePath();

  // Losangos da base
  diamond(p, X(41.05), Y(363.98), DIAMOND_HALF * s);
  diamond(p, X(386.17), Y(363.98), DIAMOND_HALF * s);

  return p;
}
