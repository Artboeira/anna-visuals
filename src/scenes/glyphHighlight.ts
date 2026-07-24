import type { SceneDef } from './types';
import { expDecay } from '../core/timing';

/**
 * Destaque de glifo — a cenografia inteira num dim quente de base e o
 * monograma da Anna pulsando em destaque. O momento de identidade do show.
 */

interface Params {
  baseLevel: number;
  basePos: number;
  glyphPos: number;
  mode: string;
  rate: number; // glifos por segundo (chase) / trocas por segundo (random)
  trail: number;
}

/** hash determinístico célula×passo — random mode sem estado */
function hash01(i: number, step: number): number {
  const x = Math.sin(i * 127.1 + step * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const glyphHighlight: SceneDef<Params, void> = {
  id: 'glyph-highlight',
  name: 'Glifos ANNA',
  gridAware: true,
  paramsSchema: [
    { key: 'baseLevel', group: 'nivel', label: 'Nível da base', type: 'number', min: 0, max: 1, step: 0.01, default: 0.35 },
    { key: 'basePos', group: 'cor', label: 'Cor da base (paleta)', type: 'number', min: 0, max: 1, step: 0.01, default: 0.15 },
    { key: 'glyphPos', group: 'cor', label: 'Cor do glifo (paleta)', type: 'number', min: 0, max: 1, step: 0.01, default: 0.9 },
    {
      key: 'mode', group: 'movimento', label: 'Modo', type: 'select', default: 'chase',
      options: [
        { label: 'Chase', value: 'chase' },
        { label: 'Aleatório', value: 'random' },
        { label: 'Beat (todos)', value: 'beat' },
      ],
    },
    { key: 'rate', group: 'movimento', label: 'Velocidade', type: 'number', min: 0.5, max: 40, step: 0.5, default: 12 },
    { key: 'trail', group: 'forma', label: 'Cauda (chase)', type: 'number', min: 1, max: 40, step: 1, default: 10 },
  ],
  defaults: { baseLevel: 0.35, basePos: 0.15, glyphPos: 0.9, mode: 'chase', rate: 12, trail: 10 },

  draw(sc) {
    const { ctx, width, height, t, beat, grid, params, sample } = sc;

    // Base: tudo num dim quente
    ctx.fillStyle = sample(0.03);
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = Math.max(0.05, params.baseLevel);
    ctx.fillStyle = sample(params.basePos);
    for (const cell of grid.cells) ctx.fill(cell.path);
    ctx.globalAlpha = 1;

    // Glifos ordenados por coluna para o chase correr pelos 27 m
    const glyphs = grid.byType.glyph;
    const n = glyphs.length;
    if (n === 0) return;

    const color = sample(params.glyphPos);
    ctx.fillStyle = color;

    if (params.mode === 'chase') {
      const progress = (t * params.rate) % n;
      for (let i = 0; i < n; i++) {
        // distância "para trás" do cursor do chase, com wrap
        const dist = (progress - i + n) % n;
        const level = Math.exp(-dist / Math.max(1, params.trail));
        if (level > 0.02) {
          ctx.globalAlpha = level;
          ctx.fill(glyphs[i].path);
        }
      }
    } else if (params.mode === 'random') {
      const step = Math.floor(t * params.rate * 0.5);
      for (let i = 0; i < n; i++) {
        const h = hash01(i, step);
        if (h > 0.72) {
          // fade dentro do passo para não piscar seco
          const stepPhase = (t * params.rate * 0.5) % 1;
          ctx.globalAlpha = (0.4 + 0.6 * h) * (1 - stepPhase * 0.5);
          ctx.fill(glyphs[i].path);
        }
      }
    } else {
      // beat: todos os glifos pulsam juntos no beat
      const level = expDecay(beat.phase01, 4);
      ctx.globalAlpha = 0.15 + 0.85 * level;
      for (const g of glyphs) ctx.fill(g.path);
    }
    ctx.globalAlpha = 1;
  },
};
