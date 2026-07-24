import type { SceneDef } from './types';

/**
 * Onda na grade — uma onda contínua quantizada por célula do cobogó.
 * `typeContrast` separa glifos e octógonos em cores diferentes da paleta.
 */

interface Params {
  waveType: string;
  wavelengthCells: number;
  speed: number; // células por segundo
  colorSpan: number;
  typeContrast: number;
  minLevel: number;
  centerX: number;
}

export const gridWave: SceneDef<Params, void> = {
  id: 'grid-wave',
  name: 'Onda (grade)',
  gridAware: true,
  paramsSchema: [
    {
      key: 'waveType', group: 'forma', label: 'Tipo de onda', type: 'select', default: 'sine',
      options: [
        { label: 'Senoide horizontal', value: 'sine' },
        { label: 'Radial', value: 'radial' },
        { label: 'Diagonal', value: 'diagonal' },
      ],
    },
    { key: 'wavelengthCells', group: 'forma', label: 'Comprimento (células)', type: 'number', min: 2, max: 50, step: 1, default: 12 },
    { key: 'speed', group: 'movimento', label: 'Velocidade (células/s)', type: 'number', min: 0.2, max: 30, step: 0.2, default: 4 },
    { key: 'colorSpan', group: 'cor', label: 'Abertura da paleta', type: 'number', min: 0.1, max: 1, step: 0.05, default: 0.6 },
    { key: 'typeContrast', group: 'cor', label: 'Contraste glifo/octógono', type: 'number', min: 0, max: 1, step: 0.01, default: 0.3 },
    { key: 'minLevel', group: 'nivel', label: 'Nível mínimo', type: 'number', min: 0, max: 1, step: 0.01, default: 0.18 },
    { key: 'centerX', group: 'forma', label: 'Centro X (radial)', type: 'number', min: 0, max: 1, step: 0.01, default: 0.5 },
  ],
  defaults: {
    waveType: 'sine',
    wavelengthCells: 12,
    speed: 4,
    colorSpan: 0.6,
    typeContrast: 0.3,
    minLevel: 0.18,
    centerX: 0.5,
  },

  draw(sc) {
    const { ctx, width, height, t, grid, params, sample } = sc;

    // Piso escuro-quente
    ctx.fillStyle = sample(0.03);
    ctx.fillRect(0, 0, width, height);

    const lambda = Math.max(2, params.wavelengthCells) * grid.cellW;
    const phase = t * params.speed * grid.cellW; // px percorridos

    for (const cell of grid.cells) {
      let d: number;
      if (params.waveType === 'radial') {
        const dx = cell.cx - params.centerX * width;
        const dy = cell.cy - height / 2;
        d = Math.sqrt(dx * dx + dy * dy);
      } else if (params.waveType === 'diagonal') {
        d = cell.cx + cell.cy * (width / height) * 0.2;
      } else {
        d = cell.cx;
      }
      const v = 0.5 + 0.5 * Math.sin((Math.PI * 2 * (d - phase)) / lambda);

      const typeShift = cell.type === 'glyph' ? params.typeContrast * 0.5 : 0;
      const level = params.minLevel + (1 - params.minLevel) * v;

      ctx.globalAlpha = level;
      ctx.fillStyle = sample(v * params.colorSpan + typeShift);
      ctx.fill(cell.path);
    }
    ctx.globalAlpha = 1;
  },
};
