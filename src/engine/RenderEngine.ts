import { useShowStore } from '../store/showStore';
import { getScene } from '../scenes/registry';
import type { AnySceneDef, SceneContext } from '../scenes/types';
import type { CobogoGrid, GridParams } from '../grid/types';
import { buildCobogoGrid } from '../grid/cobogoGrid';
import { getPalette } from '../store/palettes';
import type { Palette } from '../core/paletteTypes';
import { sampleColor, darkestStop } from '../core/colorUtils';
import { beatState, expDecay, type BeatState } from '../core/timing';
import { mulberry32, type RNG } from '../core/prng';

/**
 * Motor de render — substitui o host p5 do gradient_system por um loop
 * próprio sobre um canvas interno na resolução do LED (default 2700×270),
 * desacoplado do tamanho da janela.
 *
 * Dois decks: A é o estado vivo do show (com transição automática ao trocar
 * de cena); B é um look preparado — o crossfader compõe B sobre A.
 * Cada deck renderiza com sua PRÓPRIA paleta e params.
 */

interface SceneInstance {
  def: AnySceneDef;
  state: unknown;
  rng: RNG;
  /** relógio da cena em segundos, escalado por master.speed */
  time: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

interface FrameInfo {
  width: number;
  height: number;
  dt: number;
  beat: BeatState;
  grid: CobogoGrid;
}

function makeBuffer(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d')! };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class RenderEngine {
  private internal: HTMLCanvasElement;
  private ictx: CanvasRenderingContext2D;

  private current: SceneInstance | null = null;
  private previous: SceneInstance | null = null;
  private bInstance: SceneInstance | null = null;
  private transitionStart = 0; // ms
  private lastNow = 0; // ms
  private lastSwapCount = 0;

  private grid: CobogoGrid | null = null;
  private gridKey = '';

  constructor() {
    const { canvas, ctx } = makeBuffer(2700, 270);
    this.internal = canvas;
    this.ictx = ctx;
  }

  getCanvas(): HTMLCanvasElement {
    return this.internal;
  }

  getGrid(): CobogoGrid {
    this.ensureGrid(useShowStore.getState().gridParams);
    return this.grid!;
  }

  private ensureResolution(w: number, h: number): void {
    if (this.internal.width !== w || this.internal.height !== h) {
      this.internal.width = w;
      this.internal.height = h;
      for (const inst of [this.current, this.previous, this.bInstance]) {
        if (inst) {
          inst.canvas.width = w;
          inst.canvas.height = h;
        }
      }
    }
  }

  private ensureGrid(params: GridParams): void {
    const w = this.internal.width;
    const h = this.internal.height;
    const key = `${w}x${h}:${JSON.stringify(params)}`;
    if (this.gridKey !== key) {
      this.grid = buildCobogoGrid(params, w, h);
      this.gridKey = key;
    }
  }

  private makeInstance(
    def: AnySceneDef,
    frame: FrameInfo,
    params: Record<string, unknown> | undefined,
    palette: Palette,
  ): SceneInstance {
    const st = useShowStore.getState();
    const { canvas, ctx } = makeBuffer(this.internal.width, this.internal.height);
    const rng = mulberry32((st.master.seed ^ hashString(def.id)) >>> 0);
    const inst: SceneInstance = { def, state: undefined, rng, time: 0, canvas, ctx };
    if (def.init) {
      inst.state = def.init(this.buildContext(inst, frame, params, palette, 0));
    }
    return inst;
  }

  private buildContext(
    inst: SceneInstance,
    frame: FrameInfo,
    params: Record<string, unknown> | undefined,
    palette: Palette,
    t: number,
  ): SceneContext {
    return {
      ctx: inst.ctx,
      width: frame.width,
      height: frame.height,
      t,
      dt: frame.dt,
      beat: frame.beat,
      grid: frame.grid,
      palette,
      sample: (t01: number) => sampleColor(t01, palette),
      params: params ?? inst.def.defaults,
      rng: inst.rng,
    };
  }

  private renderScene(
    inst: SceneInstance,
    frame: FrameInfo,
    params: Record<string, unknown> | undefined,
    palette: Palette,
  ): void {
    inst.time += frame.dt;
    const sc = this.buildContext(inst, frame, params, palette, inst.time);
    // Piso zero-preto no buffer da cena
    inst.ctx.globalAlpha = 1;
    inst.ctx.globalCompositeOperation = 'source-over';
    inst.ctx.fillStyle = darkestStop(palette);
    inst.ctx.fillRect(0, 0, frame.width, frame.height);
    inst.def.draw(sc, inst.state);
    // Higiene de estado do contexto entre cenas
    inst.ctx.globalAlpha = 1;
    inst.ctx.globalCompositeOperation = 'source-over';
  }

  /** Um frame. `now` em ms (performance.now()). */
  render(now: number): void {
    const st = useShowStore.getState();
    const dtMs = this.lastNow === 0 ? 16.7 : Math.min(100, now - this.lastNow);
    this.lastNow = now;
    const dt = (dtMs / 1000) * (st.playing ? st.master.speed : 0);

    this.ensureResolution(st.output.internalWidth, st.output.internalHeight);
    this.ensureGrid(st.gridParams);

    const w = this.internal.width;
    const h = this.internal.height;
    const paletteA = getPalette(st.paletteId, st.customPalettes);
    // Beat por relógio de PAREDE (não performance.now): as janelas de
    // controle e de saída compartilham o mesmo tempo musical.
    const beat = beatState(Date.now() / 1000, st.bpm);
    const frame: FrameInfo = { width: w, height: h, dt, beat, grid: this.grid! };

    // Troca A↔B: promove as instâncias sem transição (o visual não pula,
    // porque o store já trocou os looks correspondentes)
    if (st.mix.swapCount !== this.lastSwapCount) {
      this.lastSwapCount = st.mix.swapCount;
      const oldCurrent = this.current;
      this.current = this.bInstance;
      this.bInstance = oldCurrent;
      this.previous = null;
      this.transitionStart = -1e9;
    }

    // Troca de cena no deck A → inicia transição automática
    if (!this.current || this.current.def.id !== st.sceneId) {
      this.previous = this.current;
      this.current = this.makeInstance(
        getScene(st.sceneId),
        frame,
        st.sceneParams[st.sceneId],
        paletteA,
      );
      this.transitionStart = now;
    }

    this.renderScene(this.current, frame, st.sceneParams[this.current.def.id], paletteA);

    const elapsed = now - this.transitionStart;
    const inTransition = this.previous && elapsed < st.transition.durationMs;

    // Composição no canvas interno — piso zero-preto primeiro
    this.ictx.globalAlpha = 1;
    this.ictx.globalCompositeOperation = 'source-over';
    this.ictx.fillStyle = darkestStop(paletteA);
    this.ictx.fillRect(0, 0, w, h);

    if (inTransition && this.previous) {
      this.renderScene(this.previous, frame, st.sceneParams[this.previous.def.id], paletteA);
      const p = Math.min(1, elapsed / st.transition.durationMs);
      if (st.transition.mode === 'slide') {
        this.ictx.drawImage(this.previous.canvas, 0, 0);
        this.ictx.save();
        this.ictx.beginPath();
        this.ictx.rect(0, 0, p * w, h);
        this.ictx.clip();
        this.ictx.drawImage(this.current.canvas, 0, 0);
        this.ictx.restore();
      } else {
        this.ictx.drawImage(this.previous.canvas, 0, 0);
        this.ictx.globalAlpha = p;
        this.ictx.drawImage(this.current.canvas, 0, 0);
        this.ictx.globalAlpha = 1;
      }
    } else {
      if (this.previous) this.previous = null;
      this.ictx.drawImage(this.current.canvas, 0, 0);
    }

    // Deck B: look preparado, composto por cima pelo crossfader
    const b = st.mix.b;
    if (b) {
      if (!this.bInstance || this.bInstance.def.id !== b.sceneId) {
        this.bInstance = this.makeInstance(getScene(b.sceneId), frame, b.params, b.palette);
      }
      if (st.mix.fader > 0.001) {
        this.renderScene(this.bInstance, frame, b.params, b.palette);
        this.ictx.globalAlpha = Math.min(1, st.mix.fader);
        this.ictx.drawImage(this.bInstance.canvas, 0, 0);
        this.ictx.globalAlpha = 1;
      }
    } else if (this.bInstance) {
      this.bInstance = null;
    }

    // Flash (tecla F segurada): pulso quente no beat, por cima de tudo
    if (st.flashHeld) {
      const level = 0.35 + 0.65 * expDecay(beat.phase01, 3);
      this.ictx.globalAlpha = level;
      this.ictx.fillStyle = sampleColor(0.97, paletteA);
      this.ictx.fillRect(0, 0, w, h);
      this.ictx.globalAlpha = 1;
    }

    // Dimmer master — operacional (dim físico do LED), aplicado por último
    if (st.master.brightness < 1) {
      this.ictx.globalAlpha = 1 - st.master.brightness;
      this.ictx.fillStyle = '#000';
      this.ictx.fillRect(0, 0, w, h);
      this.ictx.globalAlpha = 1;
    }
  }

  /** Thumbnail 240×24 (10:1) para o card do preset. */
  captureThumbnail(): string {
    const tw = 240;
    const th = Math.max(1, Math.round((tw * this.internal.height) / this.internal.width));
    const tmp = document.createElement('canvas');
    tmp.width = tw;
    tmp.height = th;
    tmp.getContext('2d')!.drawImage(this.internal, 0, 0, tw, th);
    return tmp.toDataURL('image/png');
  }
}

/** Singleton — UI e hooks compartilham o mesmo motor. */
export const renderEngine = new RenderEngine();
