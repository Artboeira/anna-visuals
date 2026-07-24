/**
 * Seeded pseudo-random number generator.
 * Copiado do gradient_system (src/utils/prng.ts) em 2026-07-20.
 *
 * Por que não Math.random():
 * - Math.random() é irreproduzível. Dois "mesmos" presets geram noise diferente.
 * - Com seed, o mesmo preset gera o mesmo twinkle/grain em qualquer máquina.
 *
 * mulberry32: PRNG 32-bit, período 2^32, qualidade boa o suficiente para grain visual.
 * Original: https://gist.github.com/tommyettinger/46a3c2a2f37e0026c0d8 (domínio público).
 */

export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
