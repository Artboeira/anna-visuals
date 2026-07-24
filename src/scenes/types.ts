import type { CobogoGrid } from '../grid/types';
import type { Palette } from '../core/paletteTypes';
import type { RNG } from '../core/prng';
import type { BeatState } from '../core/timing';

/**
 * Contrato de cena — o ponto de extensão do sistema.
 * Uma cena é uma função pura de t que desenha no canvas interno (10:1).
 * Cenas grid-aware recebem a geometria do cobogó e animam célula a célula.
 */

export interface SceneContext<P = Record<string, unknown>> {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** segundos desde que a cena entrou (escalado por master.speed) */
  t: number;
  /** delta do frame em segundos */
  dt: number;
  beat: BeatState;
  grid: CobogoGrid;
  palette: Palette;
  /** amostra a paleta ativa em t01 (0..1, wrap) — cacheado */
  sample: (t01: number) => string;
  params: P;
  /** PRNG determinístico, seed do master — mesmo preset, mesmo resultado */
  rng: RNG;
}

/**
 * Grupos semânticos de parâmetros — a UI da mesa agrupa por tipo,
 * para o mesmo vocabulário valer em qualquer cena.
 */
export type ParamGroup = 'movimento' | 'cor' | 'forma' | 'beat' | 'nivel';

export const PARAM_GROUPS: { id: ParamGroup; label: string }[] = [
  { id: 'movimento', label: 'Movimento' },
  { id: 'cor', label: 'Cor' },
  { id: 'forma', label: 'Forma' },
  { id: 'beat', label: 'Beat' },
  { id: 'nivel', label: 'Nível' },
];

interface ParamBase {
  key: string;
  label: string;
  /** grupo semântico para a UI agrupada (default: 'forma') */
  group?: ParamGroup;
}

export type ParamSpec =
  | (ParamBase & {
      type: 'number';
      min: number;
      max: number;
      step?: number;
      default: number;
    })
  | (ParamBase & { type: 'select'; options: { label: string; value: string }[]; default: string })
  | (ParamBase & { type: 'boolean'; default: boolean });

export interface SceneDef<P = Record<string, unknown>, S = unknown> {
  id: string;
  name: string;
  gridAware: boolean;
  paramsSchema: ParamSpec[];
  defaults: P;
  /** estado por instância (ex.: mapa de twinkle) — recriado ao entrar na cena */
  init?: (sc: SceneContext<P>) => S;
  draw: (sc: SceneContext<P>, state: S) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySceneDef = SceneDef<any, any>;

export function defaultsFromSchema(schema: ParamSpec[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const spec of schema) out[spec.key] = spec.default;
  return out;
}
