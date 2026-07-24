import type { CobogoGrid } from './types';
import { withAlpha } from '../core/colorUtils';

/**
 * Overlay de simulação da cenografia: chapa de MDF com os furos do cobogó.
 * Desenhado uma vez num canvas offscreen e cacheado — invalida só quando
 * a grade (params/resolução) muda.
 *
 * No preview, este canvas é desenhado POR CIMA do frame do LED:
 * o que se vê pelos furos é o visual; o resto é MDF sob luz ambiente quente.
 */

let cached: HTMLCanvasElement | null = null;
let cachedKey = '';

function gridKey(grid: CobogoGrid): string {
  return `${grid.width}x${grid.height}:${JSON.stringify(grid.params)}`;
}

export function getMaskOverlay(grid: CobogoGrid): HTMLCanvasElement {
  const key = gridKey(grid);
  if (cached && cachedKey === key) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = grid.width;
  canvas.height = grid.height;
  const ctx = canvas.getContext('2d')!;
  const { params } = grid;

  // Chapa de MDF
  ctx.fillStyle = params.mdfColor;
  ctx.fillRect(0, 0, grid.width, grid.height);

  // Luz ambiente quente do render — mais forte embaixo (uplight das luminárias)
  if (params.ambientAmount > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, grid.height);
    g.addColorStop(0, withAlpha(params.ambientTint, params.ambientAmount * 0.35));
    g.addColorStop(1, withAlpha(params.ambientTint, params.ambientAmount));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, grid.width, grid.height);
  }

  // Divisas sutis dos 29 painéis de MDF
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = Math.max(1, grid.height / 270);
  for (const panel of grid.panels) {
    if (panel.index === 0) continue;
    ctx.beginPath();
    ctx.moveTo(panel.x0, 0);
    ctx.lineTo(panel.x0, grid.height);
    ctx.stroke();
  }

  // Furos do cobogó
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#fff';
  for (const cell of grid.cells) {
    ctx.fill(cell.path);
  }
  ctx.globalCompositeOperation = 'source-over';

  cached = canvas;
  cachedKey = key;
  return canvas;
}
