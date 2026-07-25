import type { ShowPreset } from './showStore';
import type { Palette } from '../core/paletteTypes';
import type { GridParams } from '../grid/types';

/**
 * Persistência em localStorage — padrão do gradient_system.
 */

const PRESETS_KEY = 'anna_led_presets_v1';
const PALETTES_KEY = 'anna_led_palettes_v1';
// v4: default 54×6 com glifo em (0,0) + modo quadradinhos — calibrações
// antigas descartadas para o novo default valer em todas as máquinas
const GRID_KEY = 'anna_led_grid_v4';
const SESSION_KEY = 'anna_led_session_v1';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadPresetsFromStorage(): ShowPreset[] {
  return load<ShowPreset[]>(PRESETS_KEY, []);
}
export function savePresetsToStorage(presets: ShowPreset[]): void {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export function loadCustomPalettesFromStorage(): Palette[] {
  return load<Palette[]>(PALETTES_KEY, []);
}
export function saveCustomPalettesToStorage(palettes: Palette[]): void {
  localStorage.setItem(PALETTES_KEY, JSON.stringify(palettes));
}

export function loadGridFromStorage(): Partial<GridParams> | null {
  return load<Partial<GridParams> | null>(GRID_KEY, null);
}
export function saveGridToStorage(params: GridParams): void {
  localStorage.setItem(GRID_KEY, JSON.stringify(params));
}

export interface SessionSnapshot {
  bpm: number;
  paletteId: string;
  sceneId: string;
}
export function loadSessionFromStorage(): SessionSnapshot | null {
  return load<SessionSnapshot | null>(SESSION_KEY, null);
}
export function saveSessionToStorage(s: SessionSnapshot): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}
