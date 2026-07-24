import type { SceneDef } from './types';
import { expDecay } from '../core/timing';

/**
 * Pulse/strobe por BPM com decay exponencial.
 * SAFETY: a frequência efetiva de flash é limitada a 8 Hz — acima disso a
 * subdivisão é reduzida automaticamente (fotossensibilidade em evento lotado).
 */

const MAX_FLASH_HZ = 8;

interface Params {
  subdivision: string; // flashes por beat
  decay: number;
  colorMode: string;
  colorPos: number;
  altColorPos: number;
  floorPos: number;
}

export const strobePulse: SceneDef<Params, void> = {
  id: 'strobe-pulse',
  name: 'Pulse / Strobe',
  gridAware: false,
  paramsSchema: [
    {
      key: 'subdivision', group: 'beat', label: 'Subdivisão', type: 'select', default: '1',
      options: [
        { label: '1/1', value: '1' },
        { label: '1/2', value: '2' },
        { label: '1/4', value: '4' },
      ],
    },
    { key: 'decay', group: 'beat', label: 'Decaimento', type: 'number', min: 1, max: 12, step: 0.5, default: 5 },
    {
      key: 'colorMode', group: 'cor', label: 'Cor', type: 'select', default: 'single',
      options: [
        { label: 'Única', value: 'single' },
        { label: 'Alternada', value: 'alternate' },
      ],
    },
    { key: 'colorPos', group: 'cor', label: 'Cor A (paleta)', type: 'number', min: 0, max: 1, step: 0.01, default: 0.9 },
    { key: 'altColorPos', group: 'cor', label: 'Cor B (paleta)', type: 'number', min: 0, max: 1, step: 0.01, default: 0.5 },
    { key: 'floorPos', group: 'cor', label: 'Cor do fundo (paleta)', type: 'number', min: 0, max: 1, step: 0.01, default: 0.04 },
  ],
  defaults: {
    subdivision: '1',
    decay: 5,
    colorMode: 'single',
    colorPos: 0.9,
    altColorPos: 0.5,
    floorPos: 0.04,
  },

  draw(sc) {
    const { ctx, width, height, beat, params, sample } = sc;

    // Safety cap: reduz a subdivisão até o flash ficar ≤ 8 Hz
    let sub = parseInt(params.subdivision, 10) || 1;
    while (sub > 1 && (beat.bpm / 60) * sub > MAX_FLASH_HZ) sub = Math.floor(sub / 2);

    const ticks = (beat.beatIndex + beat.phase01) * sub;
    const tickIndex = Math.floor(ticks);
    const tickPhase = ticks - tickIndex;

    // Piso zero-preto
    ctx.fillStyle = sample(params.floorPos);
    ctx.fillRect(0, 0, width, height);

    const pos =
      params.colorMode === 'alternate' && tickIndex % 2 === 1
        ? params.altColorPos
        : params.colorPos;

    const level = expDecay(tickPhase, params.decay);
    ctx.globalAlpha = level;
    ctx.fillStyle = sample(pos);
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  },
};
