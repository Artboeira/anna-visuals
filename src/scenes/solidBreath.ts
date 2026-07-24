import type { SceneDef } from './types';

/**
 * Cor sólida respirando — o visual mais econômico e o mais fiel ao mood:
 * a cenografia inteira vira uma chapa de cor quente que pulsa devagar.
 * Zero preto: tudo é amostrado da paleta, nunca cai a #000.
 */

interface Params {
  basePos: number;
  breathDepth: number;
  periodSec: number;
  drift: number;
  spread: number;
}

export const solidBreath: SceneDef<Params, void> = {
  id: 'solid-breath',
  name: 'Sólido / Respiração',
  gridAware: false,
  paramsSchema: [
    { key: 'basePos', group: 'cor', label: 'Posição na paleta', type: 'number', min: 0, max: 1, step: 0.01, default: 0.6 },
    { key: 'breathDepth', group: 'movimento', label: 'Profundidade da respiração', type: 'number', min: 0, max: 1, step: 0.01, default: 0.35 },
    { key: 'periodSec', group: 'movimento', label: 'Período (s)', type: 'number', min: 2, max: 30, step: 0.5, default: 8 },
    { key: 'drift', group: 'cor', label: 'Deriva de matiz', type: 'number', min: 0, max: 1, step: 0.01, default: 0.15 },
    { key: 'spread', group: 'cor', label: 'Abertura vertical', type: 'number', min: 0, max: 0.5, step: 0.01, default: 0.12 },
  ],
  defaults: { basePos: 0.6, breathDepth: 0.35, periodSec: 8, drift: 0.15, spread: 0.12 },

  draw(sc) {
    const { ctx, width, height, t, params, sample } = sc;
    // Respiração: senoide lenta; deriva: senoide 4x mais lenta, defasada por PHI
    const breath = 0.5 + 0.5 * Math.sin((Math.PI * 2 * t) / params.periodSec);
    const drift = params.drift * 0.5 * Math.sin((Math.PI * 2 * t) / (params.periodSec * 4) + 1.618);
    const b = params.basePos + drift - params.breathDepth * 0.25 * (1 - breath);

    const spread = params.spread * (0.6 + 0.4 * breath);
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, sample(b + spread));
    g.addColorStop(0.5, sample(b));
    g.addColorStop(1, sample(b - spread));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  },
};
