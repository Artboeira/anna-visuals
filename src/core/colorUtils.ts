import chroma from 'chroma-js';
import type { Palette } from './paletteTypes';

/**
 * Interpolação de paleta com cache.
 * Adaptado do gradient_system (src/sketch/colorUtils.ts) em 2026-07-20:
 * desacoplado de `Layer` — trabalha sobre `Palette` (stops + colorSpace).
 */

const scaleCache = new Map<string, chroma.Scale>();

function cacheKey(palette: Palette): string {
  return `${palette.id}-${palette.colorSpace}-${palette.stops
    .map((s) => `${s.pos.toFixed(4)}${s.color}`)
    .join('')}`;
}

export function getScale(palette: Palette): chroma.Scale {
  const key = cacheKey(palette);
  let scale = scaleCache.get(key);
  if (!scale) {
    if (scaleCache.size > 64) scaleCache.clear();
    const sorted = [...palette.stops].sort((a, b) => a.pos - b.pos);
    const colors = sorted.map((s) => s.color);
    const positions = sorted.map((s) => s.pos);
    scale = chroma.scale(colors).domain(positions).mode(palette.colorSpace);
    scaleCache.set(key, scale);
  }
  return scale;
}

/** Amostra a paleta em t (wrap em [0,1)). */
export function sampleColor(t: number, palette: Palette): string {
  const normalized = ((t % 1) + 1) % 1;
  return getScale(palette)(normalized).hex();
}

/** Cor mais escura da paleta — o "piso zero-preto" do sistema. */
export function darkestStop(palette: Palette): string {
  let darkest = palette.stops[0]?.color ?? '#2a0e05';
  let minL = Infinity;
  for (const s of palette.stops) {
    const l = chroma(s.color).get('lab.l');
    if (l < minL) {
      minL = l;
      darkest = s.color;
    }
  }
  return darkest;
}

export function brighten(hex: string, amount: number): string {
  return chroma(hex).brighten(amount).hex();
}

export function darken(hex: string, amount: number): string {
  return chroma(hex).darken(amount).hex();
}

export function withAlpha(hex: string, alpha: number): string {
  return chroma(hex).alpha(alpha).css();
}

export function mix(a: string, b: string, t: number): string {
  return chroma.mix(a, b, t, 'lab').hex();
}
