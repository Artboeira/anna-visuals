import type { SceneDef } from './types';

/**
 * Gradiente lento atravessando os 27 m — o "gradient_system embutido".
 * Faixas amostradas da paleta com fase senoidal opcional (padrão do
 * drawLinear do gradient_system, desacoplado do Layer).
 */

interface Params {
  direction: string; // 'horizontal' = gradiente corre pelos 27 m
  columns: number;
  span: number; // quanto da paleta cabe na tela
  speed: number; // ciclos por minuto
  phaseMode: string;
  phaseAmount: number;
  phaseFreq: number;
}

export const gradientDrift: SceneDef<Params, void> = {
  id: 'gradient-drift',
  name: 'Gradiente / Deriva',
  gridAware: false,
  paramsSchema: [
    {
      key: 'direction', group: 'forma', label: 'Direção', type: 'select', default: 'horizontal',
      options: [
        { label: 'Horizontal (27 m)', value: 'horizontal' },
        { label: 'Vertical', value: 'vertical' },
      ],
    },
    { key: 'columns', group: 'forma', label: 'Faixas', type: 'number', min: 8, max: 300, step: 1, default: 120 },
    { key: 'span', group: 'cor', label: 'Abertura da paleta', type: 'number', min: 0.2, max: 3, step: 0.05, default: 1 },
    { key: 'speed', group: 'movimento', label: 'Velocidade (ciclos/min)', type: 'number', min: 0, max: 30, step: 0.1, default: 2 },
    {
      key: 'phaseMode', group: 'forma', label: 'Fase', type: 'select', default: 'sine',
      options: [
        { label: 'Nenhuma', value: 'none' },
        { label: 'Senoide', value: 'sine' },
        { label: 'Triângulo', value: 'triangle' },
      ],
    },
    { key: 'phaseAmount', group: 'forma', label: 'Quantidade de fase', type: 'number', min: 0, max: 1, step: 0.01, default: 0.12 },
    { key: 'phaseFreq', group: 'forma', label: 'Frequência de fase', type: 'number', min: 0.5, max: 8, step: 0.5, default: 2 },
  ],
  defaults: {
    direction: 'horizontal',
    columns: 120,
    span: 1,
    speed: 2,
    phaseMode: 'sine',
    phaseAmount: 0.12,
    phaseFreq: 2,
  },

  draw(sc) {
    const { ctx, width, height, t, params, sample } = sc;
    const isH = params.direction === 'horizontal';
    const total = isH ? width : height;
    const cols = Math.max(2, Math.round(params.columns));
    const sw = total / cols;
    const offset = (t * params.speed) / 60;

    for (let i = 0; i < cols; i++) {
      const n = i / cols;
      let phase = 0;
      if (params.phaseMode === 'sine') {
        phase = params.phaseAmount * Math.sin(n * Math.PI * 2 * params.phaseFreq);
      } else if (params.phaseMode === 'triangle') {
        const tt = (n * params.phaseFreq) % 1;
        phase = params.phaseAmount * (1 - 2 * Math.abs(tt - 0.5));
      }
      const pos = offset + n * params.span + phase;
      ctx.fillStyle = sample(pos);
      if (isH) {
        ctx.fillRect(i * sw, 0, sw + 0.6, height);
      } else {
        ctx.fillRect(0, i * sw, width, sw + 0.6);
      }
    }
  },
};
