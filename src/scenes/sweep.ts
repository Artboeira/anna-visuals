import type { SceneDef } from './types';
import { PHI } from '../core/timing';

/**
 * Varredura — barras de luz atravessando os 27 m com halo suave.
 * Múltiplas barras defasadas por golden ratio (anti-sincronismo t_system).
 */

interface Params {
  count: number;
  widthFrac: number;
  softness: number;
  speed: number; // travessias por minuto (modo livre)
  syncBeat: boolean;
  barsPerSweep: number; // compassos por travessia (modo beat)
  direction: string;
  colorPos: number;
  floorPos: number;
}

export const sweep: SceneDef<Params, void> = {
  id: 'sweep',
  name: 'Varredura',
  gridAware: false,
  paramsSchema: [
    { key: 'count', group: 'forma', label: 'Barras', type: 'number', min: 1, max: 6, step: 1, default: 1 },
    { key: 'widthFrac', group: 'forma', label: 'Largura da barra', type: 'number', min: 0.01, max: 0.5, step: 0.01, default: 0.08 },
    { key: 'softness', group: 'forma', label: 'Suavidade do halo', type: 'number', min: 0, max: 1, step: 0.01, default: 0.7 },
    { key: 'speed', group: 'movimento', label: 'Travessias/min', type: 'number', min: 0.5, max: 30, step: 0.5, default: 4 },
    { key: 'syncBeat', group: 'beat', label: 'Sync com BPM', type: 'boolean', default: false },
    { key: 'barsPerSweep', group: 'beat', label: 'Compassos por travessia', type: 'number', min: 1, max: 8, step: 1, default: 2 },
    {
      key: 'direction', group: 'movimento', label: 'Direção', type: 'select', default: 'ltr',
      options: [
        { label: '→', value: 'ltr' },
        { label: '←', value: 'rtl' },
        { label: 'Ping-pong', value: 'pingpong' },
      ],
    },
    { key: 'colorPos', group: 'cor', label: 'Cor da barra (paleta)', type: 'number', min: 0, max: 1, step: 0.01, default: 0.85 },
    { key: 'floorPos', group: 'cor', label: 'Cor do fundo (paleta)', type: 'number', min: 0, max: 1, step: 0.01, default: 0.06 },
  ],
  defaults: {
    count: 1,
    widthFrac: 0.08,
    softness: 0.7,
    speed: 4,
    syncBeat: false,
    barsPerSweep: 2,
    direction: 'ltr',
    colorPos: 0.85,
    floorPos: 0.06,
  },

  draw(sc) {
    const { ctx, width, height, t, beat, params, sample } = sc;

    // Piso zero-preto
    ctx.fillStyle = sample(params.floorPos);
    ctx.fillRect(0, 0, width, height);

    const cycles = params.syncBeat
      ? (beat.beatIndex + beat.phase01) / (4 * Math.max(1, params.barsPerSweep))
      : (t * params.speed) / 60;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const barW = Math.max(2, params.widthFrac * width);
    const halo = barW * (1 + params.softness * 4);

    for (let k = 0; k < params.count; k++) {
      let p = (cycles + k * (PHI - 1)) % 1;
      if (p < 0) p += 1;
      if (params.direction === 'rtl') p = 1 - p;
      if (params.direction === 'pingpong') p = 1 - 2 * Math.abs(p - 0.5);

      // A barra percorre além das bordas para entrar/sair limpa
      const x = -halo + p * (width + 2 * halo);
      const color = sample(params.colorPos + k * 0.09);

      const g = ctx.createLinearGradient(x - halo, 0, x + halo, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5 - (0.5 * barW) / (2 * halo), color);
      g.addColorStop(0.5 + (0.5 * barW) / (2 * halo), color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - halo, 0, halo * 2, height);
    }
    ctx.restore();
  },
};
