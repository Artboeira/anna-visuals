import { useShowStore } from '../store/showStore';

/**
 * Sincronização entre a JANELA DE CONTROLE (MESA) e a JANELA DE SAÍDA
 * (?output=1, capturada pelo Electron para NDI/Syphon/Spout).
 *
 * BroadcastChannel na mesma origem: a janela de controle publica um snapshot
 * do estado do show a cada mudança (coalescido por rAF); a de saída aplica.
 * O beat usa relógio de parede (Date.now) no engine — as duas janelas batem
 * no mesmo tempo musical.
 */

const CHANNEL = 'anna-led-sync';

/** Campos que definem o que está tocando — tudo que o engine lê. */
const SYNC_KEYS = [
  'sceneId',
  'sceneParams',
  'paletteId',
  'customPalettes',
  'master',
  'bpm',
  'playing',
  'flashHeld',
  'transition',
  'mix',
  'gridParams',
  'output',
] as const;

type SyncSnapshot = Record<string, unknown>;

function snapshot(): SyncSnapshot {
  const st = useShowStore.getState() as unknown as Record<string, unknown>;
  const out: SyncSnapshot = {};
  for (const k of SYNC_KEYS) out[k] = st[k];
  return out;
}

/** Janela de controle: publica o estado; responde ao "hello" da saída. */
export function startControlSync(): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const bc = new BroadcastChannel(CHANNEL);
  let scheduled = false;

  useShowStore.subscribe(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      bc.postMessage({ type: 'state', state: snapshot() });
    });
  });

  bc.onmessage = (e) => {
    if (e.data?.type === 'hello') {
      bc.postMessage({ type: 'state', state: snapshot() });
    }
  };
}

/** Janela de saída: aplica snapshots recebidos; pede o estado ao abrir. */
export function startOutputSync(): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const bc = new BroadcastChannel(CHANNEL);
  bc.onmessage = (e) => {
    if (e.data?.type === 'state' && e.data.state) {
      useShowStore.setState(e.data.state as Partial<ReturnType<typeof useShowStore.getState>>);
    }
  };
  bc.postMessage({ type: 'hello' });
}
