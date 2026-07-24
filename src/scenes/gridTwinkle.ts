import type { SceneDef } from './types';

/**
 * Twinkle — células do cobogó acendendo individualmente, como pontos de
 * luz quente (o efeito do render Scene 29). Grid-aware: cada furo é um pixel.
 */

interface Params {
  density: number; // eventos por segundo na grade inteira
  attack: number; // s
  decay: number; // s
  onlyType: string;
  hueSpread: number;
  floorPos: number;
  floorLevel: number;
}

interface State {
  levels: Float32Array;
  hues: Float32Array;
}

export const gridTwinkle: SceneDef<Params, State> = {
  id: 'grid-twinkle',
  name: 'Twinkle (grade)',
  gridAware: true,
  paramsSchema: [
    { key: 'density', group: 'nivel', label: 'Densidade (acendimentos/s)', type: 'number', min: 1, max: 120, step: 1, default: 25 },
    { key: 'attack', group: 'movimento', label: 'Ataque (s)', type: 'number', min: 0.01, max: 2, step: 0.01, default: 0.05 },
    { key: 'decay', group: 'movimento', label: 'Decaimento (s)', type: 'number', min: 0.1, max: 8, step: 0.1, default: 1.6 },
    {
      key: 'onlyType', group: 'forma', label: 'Células', type: 'select', default: 'all',
      options: [
        { label: 'Todas', value: 'all' },
        { label: 'Octógonos', value: 'octagon' },
        { label: 'Glifos', value: 'glyph' },
      ],
    },
    { key: 'hueSpread', group: 'cor', label: 'Variação de cor', type: 'number', min: 0, max: 1, step: 0.01, default: 0.25 },
    { key: 'floorPos', group: 'cor', label: 'Cor do fundo (paleta)', type: 'number', min: 0, max: 1, step: 0.01, default: 0.05 },
    { key: 'floorLevel', group: 'nivel', label: 'Nível do fundo', type: 'number', min: 0, max: 1, step: 0.01, default: 0.5 },
  ],
  defaults: {
    density: 25,
    attack: 0.05,
    decay: 1.6,
    onlyType: 'all',
    hueSpread: 0.25,
    floorPos: 0.05,
    floorLevel: 0.5,
  },

  init(sc) {
    const n = sc.grid.cells.length;
    const hues = new Float32Array(n);
    for (let i = 0; i < n; i++) hues[i] = sc.rng();
    return { levels: new Float32Array(n), hues };
  },

  draw(sc, state) {
    const { ctx, width, height, dt, grid, params, sample, rng } = sc;

    // Piso quente
    ctx.fillStyle = sample(params.floorPos);
    ctx.globalAlpha = Math.max(0.08, params.floorLevel);
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;

    const eligible =
      params.onlyType === 'all' ? grid.cells : grid.byType[params.onlyType as 'octagon' | 'glyph'];
    if (eligible.length === 0) return;

    // Dispara novos acendimentos
    const expected = params.density * dt;
    let events = Math.floor(expected);
    if (rng() < expected - events) events += 1;
    for (let e = 0; e < events; e++) {
      const cell = eligible[Math.floor(rng() * eligible.length)];
      const idx = cell.row * grid.params.cols + cell.col;
      state.levels[idx] = 1;
      state.hues[idx] = 0.5 + (rng() - 0.5) * params.hueSpread * 2;
    }

    // Desenha e decai
    const decayK = Math.exp(-dt / Math.max(0.05, params.decay));
    for (const cell of eligible) {
      const idx = cell.row * grid.params.cols + cell.col;
      const level = state.levels[idx];
      if (level > 0.01) {
        ctx.globalAlpha = level;
        ctx.fillStyle = sample(state.hues[idx]);
        ctx.fill(cell.path);
        state.levels[idx] = level * decayK;
      } else {
        state.levels[idx] = 0;
      }
    }
    ctx.globalAlpha = 1;
  },
};
