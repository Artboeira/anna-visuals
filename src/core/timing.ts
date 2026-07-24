/**
 * Clock musical do sistema — tudo que anima em relação ao BPM lê daqui.
 * Filosofia t_system: animação time-based por funções puras de t.
 */

/** Golden ratio — offsets de fase anti-sincronismo entre elementos. */
export const PHI = 1.618033988749895;

export interface BeatState {
  bpm: number;
  /** fase dentro do beat atual, 0..1 */
  phase01: number;
  /** fase dentro do compasso (4 beats), 0..1 */
  bar01: number;
  /** índice inteiro do beat desde t=0 */
  beatIndex: number;
}

export function beatState(timeSec: number, bpm: number): BeatState {
  const beats = (timeSec * bpm) / 60;
  return {
    bpm,
    phase01: ((beats % 1) + 1) % 1,
    bar01: (((beats / 4) % 1) + 1) % 1,
    beatIndex: Math.floor(beats),
  };
}

/**
 * Tap tempo: média dos intervalos das últimas batidas.
 * Retorna o BPM estimado ou null enquanto não há taps suficientes.
 */
export class TapTempo {
  private taps: number[] = [];

  tap(now: number = performance.now()): number | null {
    // Se o último tap foi há mais de 2s, recomeça a medição.
    if (this.taps.length > 0 && now - this.taps[this.taps.length - 1] > 2000) {
      this.taps = [];
    }
    this.taps.push(now);
    if (this.taps.length < 2) return null;
    if (this.taps.length > 8) this.taps.shift();

    let sum = 0;
    for (let i = 1; i < this.taps.length; i++) sum += this.taps[i] - this.taps[i - 1];
    const avgMs = sum / (this.taps.length - 1);
    const bpm = 60000 / avgMs;
    return Math.round(Math.min(200, Math.max(60, bpm)));
  }
}

/** Envelope exponencial de decay: 1 no ataque, → 0. */
export function expDecay(phase01: number, decay: number): number {
  return Math.exp(-phase01 * decay);
}
