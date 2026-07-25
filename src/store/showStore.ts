import { create } from 'zustand';
import type { Palette } from '../core/paletteTypes';
import type { GridParams, GlyphParams } from '../grid/types';
import { DEFAULT_GRID_PARAMS } from '../grid/types';
import { SCENES, getScene } from '../scenes/registry';
import { getPalette, PALETTES } from './palettes';
import {
  loadPresetsFromStorage,
  savePresetsToStorage,
  loadCustomPalettesFromStorage,
  saveCustomPalettesToStorage,
  loadGridFromStorage,
  saveGridToStorage,
  loadSessionFromStorage,
  saveSessionToStorage,
} from './presetsStorage';

/**
 * Store central do show — padrão do gradientStore, centrado em CENA
 * (não em layers): cena ativa + params por cena + paleta + master + grade.
 */

export interface MasterState {
  brightness: number; // 0..1 — dimmer master da saída
  speed: number; // multiplicador do relógio das cenas
  seed: number;
}

export interface OutputSettings {
  internalWidth: number;
  internalHeight: number;
  fps: 30 | 60;
}

export interface UiState {
  showMask: boolean;
  ghost: boolean;
  ghostAlpha: number;
  /** modo palco (P): preview limpo em tela cheia, 10:1 com cobogó, sem painel */
  clean: boolean;
  /** modo saída (O): frame cru esticado na janela — é o que o Electron captura */
  presentation: boolean;
  activeTab: 'mesa' | 'cena' | 'cor' | 'grade' | 'presets' | 'output';
}

/**
 * Um "look" completo e autossuficiente: cena + params + paleta.
 * O deck A é o estado vivo do show; o deck B é um look preparado —
 * o crossfader mistura os dois no engine.
 */
export interface DeckLook {
  sceneId: string;
  params: Record<string, unknown>;
  palette: Palette;
  name: string;
}

export interface MixState {
  b: DeckLook | null;
  /** 0 = só deck A (estado vivo), 1 = só deck B */
  fader: number;
  /** incrementa a cada troca A↔B — o engine promove as instâncias sem transição */
  swapCount: number;
}

export interface TransitionSettings {
  durationMs: number;
  mode: 'crossfade' | 'slide';
}

export interface ShowPreset {
  id: string;
  name: string;
  createdAt: number;
  thumbnail: string; // dataURL PNG
  sceneId: string;
  params: Record<string, unknown>;
  palette: Palette; // embutida — o JSON exportado é autossuficiente
  master: MasterState;
  bpm: number;
}

function sceneDefaults(): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const s of SCENES) out[s.id] = { ...s.defaults };
  return out;
}

let presetCounter = 0;
function genPresetId(): string {
  return `preset-${Date.now()}-${presetCounter++}`;
}

interface ShowState {
  sceneId: string;
  sceneParams: Record<string, Record<string, unknown>>;
  paletteId: string;
  customPalettes: Palette[];
  master: MasterState;
  bpm: number;
  playing: boolean;
  flashHeld: boolean;
  output: OutputSettings;
  gridParams: GridParams;
  ui: UiState;
  transition: TransitionSettings;
  presets: ShowPreset[];
  mix: MixState;

  activePalette: () => Palette;
  currentLook: () => DeckLook;

  setScene: (id: string) => void;
  setSceneParam: (sceneId: string, key: string, value: unknown) => void;
  resetSceneParams: (sceneId: string) => void;

  setPalette: (id: string) => void;
  addCustomPalette: (p: Palette) => void;
  updateCustomPalette: (p: Palette) => void;
  removeCustomPalette: (id: string) => void;

  setMaster: (partial: Partial<MasterState>) => void;
  setBpm: (bpm: number) => void;
  togglePlaying: () => void;
  setFlashHeld: (held: boolean) => void;

  setOutput: (partial: Partial<OutputSettings>) => void;
  setGridParams: (partial: Partial<GridParams>) => void;
  setGlyphParams: (partial: Partial<GlyphParams>) => void;
  resetGridParams: () => void;

  setUi: (partial: Partial<UiState>) => void;
  setTransition: (partial: Partial<TransitionSettings>) => void;

  savePreset: (name: string, thumbnail: string) => void;
  loadPreset: (id: string) => void;
  loadPresetByIndex: (index: number) => void;
  deletePreset: (id: string) => void;
  importPresets: (presets: ShowPreset[]) => void;

  setFader: (v: number) => void;
  setDeckB: (look: DeckLook | null) => void;
  loadPresetToDeckB: (id: string) => void;
  loadPresetToDeckBByIndex: (index: number) => void;
  captureCurrentToDeckB: () => void;
  swapDecks: () => void;
}

const storedGrid = loadGridFromStorage();
const storedSession = loadSessionFromStorage();

// Deep-links de operação (tape-machine / verificação):
//   ?scene=<id>   cena inicial   ?present=1  modo saída   ?clean=1  modo palco
//   ?mask=0       oculta cobogó  ?ghost=1    ghost        ?tab=<id> aba inicial
const urlParams =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

/**
 * Janela de saída dedicada (?output=1): renderiza só o canvas full-bleed —
 * é ela que o Electron captura. O estado chega via windowSync.
 */
export const IS_OUTPUT_WINDOW = urlParams?.get('output') === '1';

const TAB_IDS = ['mesa', 'cena', 'cor', 'grade', 'presets', 'output'] as const;
const urlTab = urlParams?.get('tab') as UiState['activeTab'] | null;
const initialTab: UiState['activeTab'] =
  urlTab && (TAB_IDS as readonly string[]).includes(urlTab) ? urlTab : 'mesa';
const urlScene = urlParams?.get('scene');
const initialScene =
  urlScene && SCENES.some((s) => s.id === urlScene)
    ? urlScene
    : storedSession?.sceneId ?? 'solid-breath';

export const useShowStore = create<ShowState>((set, get) => ({
  sceneId: initialScene,
  sceneParams: sceneDefaults(),
  paletteId: storedSession?.paletteId ?? PALETTES[0].id,
  customPalettes: loadCustomPalettesFromStorage(),
  master: { brightness: 1, speed: 1, seed: 20260720 },
  bpm: storedSession?.bpm ?? 124,
  playing: true,
  flashHeld: false,
  output: { internalWidth: 2700, internalHeight: 270, fps: 60 },
  gridParams: storedGrid
    ? {
        ...DEFAULT_GRID_PARAMS,
        ...storedGrid,
        cellShape:
          storedGrid.cellShape === 'quadrado' || storedGrid.cellShape === 'silhueta'
            ? storedGrid.cellShape
            : DEFAULT_GRID_PARAMS.cellShape,
        squareScale:
          typeof storedGrid.squareScale === 'number'
            ? storedGrid.squareScale
            : DEFAULT_GRID_PARAMS.squareScale,
        // Hidratação validada do glifo: só os campos conhecidos e numéricos —
        // shapes antigos (v1/v2 tinham barWidth, dotRadius...) são descartados
        glyph: {
          scale:
            typeof storedGrid.glyph?.scale === 'number'
              ? storedGrid.glyph.scale
              : DEFAULT_GRID_PARAMS.glyph.scale,
          offsetY:
            typeof storedGrid.glyph?.offsetY === 'number'
              ? storedGrid.glyph.offsetY
              : DEFAULT_GRID_PARAMS.glyph.offsetY,
        },
      }
    : DEFAULT_GRID_PARAMS,
  ui: {
    showMask: urlParams?.get('mask') !== '0',
    ghost: urlParams?.get('ghost') === '1',
    ghostAlpha: 0.5,
    clean: urlParams?.get('clean') === '1',
    presentation: IS_OUTPUT_WINDOW || urlParams?.get('present') === '1',
    activeTab: initialTab,
  },
  transition: { durationMs: 2000, mode: 'crossfade' },
  presets: loadPresetsFromStorage(),
  mix: { b: null, fader: 0, swapCount: 0 },

  activePalette: () => {
    const { paletteId, customPalettes } = get();
    return getPalette(paletteId, customPalettes);
  },

  currentLook: () => {
    const st = get();
    return {
      sceneId: st.sceneId,
      params: { ...st.sceneParams[st.sceneId] },
      palette: st.activePalette(),
      name: getScene(st.sceneId).name,
    };
  },

  setScene: (id) => {
    set({ sceneId: id });
    persistSession(get());
  },
  setSceneParam: (sceneId, key, value) =>
    set((st) => ({
      sceneParams: {
        ...st.sceneParams,
        [sceneId]: { ...st.sceneParams[sceneId], [key]: value },
      },
    })),
  resetSceneParams: (sceneId) =>
    set((st) => ({
      sceneParams: { ...st.sceneParams, [sceneId]: { ...getScene(sceneId).defaults } },
    })),

  setPalette: (id) => {
    set({ paletteId: id });
    persistSession(get());
  },
  addCustomPalette: (p) => {
    const customPalettes = [...get().customPalettes, p];
    set({ customPalettes });
    saveCustomPalettesToStorage(customPalettes);
  },
  updateCustomPalette: (p) => {
    const customPalettes = get().customPalettes.map((c) => (c.id === p.id ? p : c));
    set({ customPalettes });
    saveCustomPalettesToStorage(customPalettes);
  },
  removeCustomPalette: (id) => {
    const st = get();
    const customPalettes = st.customPalettes.filter((c) => c.id !== id);
    const paletteId = st.paletteId === id ? PALETTES[0].id : st.paletteId;
    set({ customPalettes, paletteId });
    saveCustomPalettesToStorage(customPalettes);
  },

  setMaster: (partial) => set((st) => ({ master: { ...st.master, ...partial } })),
  setBpm: (bpm) => {
    set({ bpm: Math.min(200, Math.max(60, Math.round(bpm))) });
    persistSession(get());
  },
  togglePlaying: () => set((st) => ({ playing: !st.playing })),
  setFlashHeld: (held) => set({ flashHeld: held }),

  setOutput: (partial) => set((st) => ({ output: { ...st.output, ...partial } })),
  setGridParams: (partial) => {
    const gridParams = { ...get().gridParams, ...partial };
    set({ gridParams });
    saveGridToStorage(gridParams);
  },
  setGlyphParams: (partial) => {
    const st = get();
    const gridParams = { ...st.gridParams, glyph: { ...st.gridParams.glyph, ...partial } };
    set({ gridParams });
    saveGridToStorage(gridParams);
  },
  resetGridParams: () => {
    set({ gridParams: DEFAULT_GRID_PARAMS });
    saveGridToStorage(DEFAULT_GRID_PARAMS);
  },

  setUi: (partial) => set((st) => ({ ui: { ...st.ui, ...partial } })),
  setTransition: (partial) => set((st) => ({ transition: { ...st.transition, ...partial } })),

  savePreset: (name, thumbnail) => {
    const st = get();
    const preset: ShowPreset = {
      id: genPresetId(),
      name,
      createdAt: Date.now(),
      thumbnail,
      sceneId: st.sceneId,
      params: { ...st.sceneParams[st.sceneId] },
      palette: st.activePalette(),
      master: { ...st.master },
      bpm: st.bpm,
    };
    const presets = [...st.presets, preset];
    set({ presets });
    savePresetsToStorage(presets);
  },

  loadPreset: (id) => {
    const st = get();
    const preset = st.presets.find((p) => p.id === id);
    if (!preset) return;
    // Paleta embutida: se não é built-in nem custom conhecida, registra como custom
    const known =
      PALETTES.some((p) => p.id === preset.palette.id) ||
      st.customPalettes.some((p) => p.id === preset.palette.id);
    const customPalettes = known ? st.customPalettes : [...st.customPalettes, preset.palette];
    if (!known) saveCustomPalettesToStorage(customPalettes);
    set({
      sceneId: preset.sceneId,
      sceneParams: {
        ...st.sceneParams,
        [preset.sceneId]: { ...getScene(preset.sceneId).defaults, ...preset.params },
      },
      paletteId: preset.palette.id,
      customPalettes,
      master: { ...preset.master },
      bpm: preset.bpm,
    });
    persistSession(get());
  },

  loadPresetByIndex: (index) => {
    const preset = get().presets[index];
    if (preset) get().loadPreset(preset.id);
  },

  deletePreset: (id) => {
    const presets = get().presets.filter((p) => p.id !== id);
    set({ presets });
    savePresetsToStorage(presets);
  },

  setFader: (v) =>
    set((st) => ({ mix: { ...st.mix, fader: Math.min(1, Math.max(0, v)) } })),

  setDeckB: (look) => set((st) => ({ mix: { ...st.mix, b: look } })),

  loadPresetToDeckB: (id) => {
    const st = get();
    const preset = st.presets.find((p) => p.id === id);
    if (!preset) return;
    set({
      mix: {
        ...st.mix,
        b: {
          sceneId: preset.sceneId,
          params: { ...getScene(preset.sceneId).defaults, ...preset.params },
          palette: preset.palette,
          name: preset.name,
        },
      },
    });
  },

  loadPresetToDeckBByIndex: (index) => {
    const preset = get().presets[index];
    if (preset) get().loadPresetToDeckB(preset.id);
  },

  captureCurrentToDeckB: () => {
    const st = get();
    set({ mix: { ...st.mix, b: st.currentLook() } });
  },

  swapDecks: () => {
    const st = get();
    const b = st.mix.b;
    if (!b) return;
    const oldA = st.currentLook();
    // Registra a paleta do B se ainda não é conhecida (mesma regra do loadPreset)
    const known =
      PALETTES.some((p) => p.id === b.palette.id) ||
      st.customPalettes.some((p) => p.id === b.palette.id);
    const customPalettes = known ? st.customPalettes : [...st.customPalettes, b.palette];
    if (!known) saveCustomPalettesToStorage(customPalettes);
    set({
      sceneId: b.sceneId,
      sceneParams: {
        ...st.sceneParams,
        [b.sceneId]: { ...getScene(b.sceneId).defaults, ...b.params },
      },
      paletteId: b.palette.id,
      customPalettes,
      mix: { b: oldA, fader: 0, swapCount: st.mix.swapCount + 1 },
    });
    persistSession(get());
  },

  importPresets: (imported) => {
    // hydrate mínimo: garante campos e ids únicos
    const existing = get().presets;
    const existingIds = new Set(existing.map((p) => p.id));
    const merged = [
      ...existing,
      ...imported
        .filter((p) => p && p.sceneId && p.palette)
        .map((p) => (existingIds.has(p.id) ? { ...p, id: genPresetId() } : p)),
    ];
    set({ presets: merged });
    savePresetsToStorage(merged);
  },
}));

function persistSession(st: ShowState): void {
  saveSessionToStorage({ bpm: st.bpm, paletteId: st.paletteId, sceneId: st.sceneId });
}
