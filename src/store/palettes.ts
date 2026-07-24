import type { Palette } from '../core/paletteTypes';

/**
 * Paletas curadas do show — mood âmbar quente dos renders (Scene 29/34),
 * amostrado do lustre, das cortinas e da luz que vaza pelo cobogó.
 *
 * Regra zero-preto (t_system): o stop mais escuro de toda paleta tem matiz —
 * nunca #000. O escuro é cor saturada profunda; o cobogó nunca "apaga".
 *
 * Estrutura compatível com o formato de paleta do gradient_system.
 */

let stopId = 0;
function stops(...pairs: [number, string][]): Palette['stops'] {
  return pairs.map(([pos, color]) => ({ id: `ps-${stopId++}`, pos, color }));
}

export const PALETTES: Palette[] = [
  // ── warm-core: o coração do show ──────────────────────────────────
  {
    id: 'ambar-lustre',
    name: 'Âmbar Lustre',
    cluster: 'warm-core',
    colorSpace: 'lab',
    stops: stops([0, '#2a0e05'], [0.35, '#c25e12'], [0.7, '#f5a93e'], [1, '#ffe0b0']),
  },
  {
    id: 'ember',
    name: 'Ember',
    cluster: 'warm-core',
    colorSpace: 'lab',
    stops: stops([0, '#230a04'], [0.4, '#8a2c0e'], [0.75, '#e06a1f'], [1, '#ffc37a']),
  },
  {
    id: 'cobre',
    name: 'Cobre',
    cluster: 'warm-core',
    colorSpace: 'lab',
    stops: stops([0, '#1f0d06'], [0.35, '#6e3a18'], [0.7, '#c07a3a'], [1, '#f2d3a0']),
  },
  {
    id: 'cortina',
    name: 'Cortina',
    cluster: 'warm-core',
    colorSpace: 'lab',
    stops: stops([0, '#2b1508'], [0.4, '#8a5a28'], [0.75, '#d9a75e'], [1, '#fff1cf']),
  },
  {
    id: 'ouro-velho',
    name: 'Ouro Velho',
    cluster: 'warm-core',
    colorSpace: 'lab',
    stops: stops([0, '#241505'], [0.4, '#7a5518'], [0.75, '#c99b3f'], [1, '#f7e6b2']),
  },
  {
    id: 'mel',
    name: 'Mel',
    cluster: 'warm-core',
    colorSpace: 'lab',
    stops: stops([0, '#2b1607'], [0.4, '#9c5f14'], [0.72, '#e8a83e'], [1, '#ffe9c4']),
  },
  {
    id: 'tungstenio',
    name: 'Tungstênio',
    cluster: 'warm-core',
    colorSpace: 'lab',
    stops: stops([0, '#1f0f08'], [0.35, '#8a4a1d'], [0.7, '#e8ae6a'], [1, '#fff3e0']),
  },
  {
    id: 'terracota',
    name: 'Terracota',
    cluster: 'warm-core',
    colorSpace: 'lab',
    stops: stops([0, '#26100a'], [0.4, '#8a3c22'], [0.75, '#cd7a4e'], [1, '#f4d9b8']),
  },

  // ── ember: vermelhos e rosas profundos ────────────────────────────
  {
    id: 'vermelho-profundo',
    name: 'Vermelho Profundo',
    cluster: 'ember',
    colorSpace: 'lab',
    stops: stops([0, '#26060a'], [0.4, '#7a1220'], [0.75, '#d1372c'], [1, '#ff9d66']),
  },
  {
    id: 'rosa-quente',
    name: 'Rosa Quente',
    cluster: 'ember',
    colorSpace: 'lab',
    stops: stops([0, '#2c0918'], [0.4, '#8e2a52'], [0.72, '#e05c74'], [1, '#ffc9a3']),
  },
  {
    id: 'vinho-dourado',
    name: 'Vinho & Dourado',
    cluster: 'ember',
    colorSpace: 'lab',
    stops: stops([0, '#2b0d16'], [0.35, '#582d40'], [0.7, '#c98a3e'], [1, '#f5d489']),
  },
  {
    id: 'garnet',
    name: 'Garnet',
    cluster: 'ember',
    colorSpace: 'lab',
    stops: stops([0, '#220711'], [0.45, '#8a1d33'], [0.8, '#d4674a'], [1, '#ffd2a8']),
  },
  {
    id: 'magenta-noite',
    name: 'Magenta Noite',
    cluster: 'ember',
    colorSpace: 'lab',
    stops: stops([0, '#260a1e'], [0.42, '#7c1f5a'], [0.75, '#d4478c'], [1, '#ffb98f']),
  },
  {
    id: 'coral',
    name: 'Coral',
    cluster: 'ember',
    colorSpace: 'lab',
    stops: stops([0, '#2a0d0d'], [0.4, '#97323a'], [0.72, '#e8705f'], [1, '#ffd3ad']),
  },
  {
    id: 'sangue-ouro',
    name: 'Sangue & Ouro',
    cluster: 'ember',
    colorSpace: 'lab',
    stops: stops([0, '#240707'], [0.35, '#8f1f1c'], [0.65, '#d4562a'], [1, '#f2c56a']),
  },
  {
    id: 'purpura-quente',
    name: 'Púrpura Quente',
    cluster: 'ember',
    colorSpace: 'lab',
    stops: stops([0, '#1f0a24'], [0.38, '#582d40'], [0.7, '#a8446a'], [1, '#f0a06a']),
  },

  // ── accent: momentos de contraste (usados com parcimônia) ─────────
  {
    id: 'azul-noite',
    name: 'Azul-Noite',
    cluster: 'accent',
    colorSpace: 'lab',
    stops: stops([0, '#0a1226'], [0.45, '#26456e'], [0.8, '#4b657e'], [1, '#c9d8e0']),
  },
  {
    id: 'verde-profundo',
    name: 'Verde Profundo',
    cluster: 'accent',
    colorSpace: 'lab',
    stops: stops([0, '#0d1a10'], [0.45, '#3d5a2e'], [0.8, '#89993e'], [1, '#e9e6b8']),
  },
  {
    id: 'petroleo',
    name: 'Petróleo',
    cluster: 'accent',
    colorSpace: 'lab',
    stops: stops([0, '#071a1c'], [0.45, '#14555c'], [0.78, '#3d8a8a'], [1, '#cfe8dd']),
  },
  {
    id: 'ametista',
    name: 'Ametista',
    cluster: 'accent',
    colorSpace: 'lab',
    stops: stops([0, '#150a26'], [0.45, '#45276e'], [0.78, '#8a5fb0'], [1, '#e8d4f0']),
  },
  {
    id: 'ultravioleta',
    name: 'Ultravioleta',
    cluster: 'accent',
    colorSpace: 'lab',
    stops: stops([0, '#0f0626'], [0.45, '#3a1a7a'], [0.75, '#7048c8'], [1, '#c9b8f0']),
  },
  {
    id: 'noite-ambar',
    name: 'Noite & Âmbar',
    cluster: 'accent',
    colorSpace: 'lab',
    stops: stops([0, '#0a1226'], [0.35, '#26456e'], [0.75, '#c25e12'], [1, '#f5a93e']),
  },
];

export const CLUSTER_LABELS: Record<Palette['cluster'], string> = {
  'warm-core': 'Âmbar / Núcleo',
  ember: 'Brasa',
  accent: 'Acentos',
  custom: 'Custom',
};

export function getPalette(id: string, custom: Palette[] = []): Palette {
  return (
    PALETTES.find((p) => p.id === id) ?? custom.find((p) => p.id === id) ?? PALETTES[0]
  );
}
