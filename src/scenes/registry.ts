import type { AnySceneDef } from './types';
import { solidBreath } from './solidBreath';
import { gradientDrift } from './gradientDrift';
import { sweep } from './sweep';
import { radialEcho } from './radialEcho';
import { gridTwinkle } from './gridTwinkle';
import { gridWave } from './gridWave';
import { glyphHighlight } from './glyphHighlight';
import { strobePulse } from './strobePulse';

/**
 * Registry de cenas — para adicionar uma cena nova, crie o módulo com o
 * contrato SceneDef e acrescente aqui. A UI de parâmetros é gerada do schema.
 */
export const SCENES: AnySceneDef[] = [
  solidBreath,
  gradientDrift,
  sweep,
  radialEcho,
  gridTwinkle,
  gridWave,
  glyphHighlight,
  strobePulse,
];

export function getScene(id: string): AnySceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0];
}
