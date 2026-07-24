import type { SceneDef } from './types';

/**
 * Eco radial — círculos concêntricos pulsando de um centro configurável.
 * Silhueta de alto contraste ecoando o lustre radial do palco.
 */

interface Params {
  centerX: number;
  centerY: number;
  rings: number;
  pulsePerBar: number;
  syncBeat: boolean;
  speed: number; // anéis por minuto (modo livre)
  colorSpan: number;
  invert: boolean;
}

export const radialEcho: SceneDef<Params, void> = {
  id: 'radial-echo',
  name: 'Eco Radial',
  gridAware: false,
  paramsSchema: [
    { key: 'centerX', group: 'forma', label: 'Centro X', type: 'number', min: 0, max: 1, step: 0.01, default: 0.5 },
    { key: 'centerY', group: 'forma', label: 'Centro Y', type: 'number', min: 0, max: 1, step: 0.01, default: 0.5 },
    { key: 'rings', group: 'forma', label: 'Anéis', type: 'number', min: 3, max: 60, step: 1, default: 14 },
    { key: 'syncBeat', group: 'beat', label: 'Sync com BPM', type: 'boolean', default: true },
    { key: 'pulsePerBar', group: 'beat', label: 'Pulsos por compasso', type: 'number', min: 1, max: 8, step: 1, default: 1 },
    { key: 'speed', group: 'movimento', label: 'Anéis/min (livre)', type: 'number', min: 1, max: 120, step: 1, default: 20 },
    { key: 'colorSpan', group: 'cor', label: 'Abertura da paleta', type: 'number', min: 0.1, max: 2, step: 0.05, default: 0.8 },
    { key: 'invert', group: 'movimento', label: 'Inverter (contrai)', type: 'boolean', default: false },
  ],
  defaults: {
    centerX: 0.5,
    centerY: 0.5,
    rings: 14,
    syncBeat: true,
    pulsePerBar: 1,
    speed: 20,
    colorSpan: 0.8,
    invert: false,
  },

  draw(sc) {
    const { ctx, width, height, t, beat, params, sample } = sc;
    const cx = params.centerX * width;
    const cy = params.centerY * height;
    // Raio até o canto mais distante — cobre a faixa inteira
    const fx = Math.max(cx, width - cx);
    const fy = Math.max(cy, height - cy);
    const maxR = Math.sqrt(fx * fx + fy * fy) + 2;

    const rings = Math.max(3, Math.round(params.rings));
    let phase = params.syncBeat
      ? (beat.beatIndex + beat.phase01) * (params.pulsePerBar / 4)
      : (t * params.speed) / 60;
    if (params.invert) phase = -phase;
    phase = ((phase % 1) + 1) % 1;

    // De fora para dentro, cada anel amostra a paleta deslocada pela fase
    for (let i = rings - 1; i >= 0; i--) {
      const r = ((i + phase) / rings) * maxR;
      if (r <= 0) continue;
      ctx.fillStyle = sample((i / rings) * params.colorSpan + phase / rings);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Miolo: fecha o centro com a próxima cor da sequência
    ctx.fillStyle = sample(phase / rings);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, (phase / rings) * maxR), 0, Math.PI * 2);
    ctx.fill();
  },
};
