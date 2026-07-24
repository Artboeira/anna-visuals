import { useEffect, useRef } from 'react';
import { useShowStore } from '../store/showStore';
import { TapTempo } from '../core/timing';

/**
 * Atalhos do show:
 *  Espaço    play/pause
 *  P         modo palco (preview limpo em tela cheia, 10:1 com cobogó)
 *  O         modo saída (frame cru esticado — captura do Electron p/ LED)
 *  Esc       sai do modo palco/saída
 *  M         simulação do cobogó no preview
 *  G         ghost de calibração (layout de referência)
 *  T         tap tempo
 *  F         flash quente (segurar)
 *  1–9       carregar preset no DECK B (prepara para o crossfade)
 *  Shift+1–9 aplicar preset direto no look vivo (com transição)
 *  [ / ]     crossfader A↔B
 *  X         trocar A⇄B
 */
export function useKeyboard(): void {
  const tapRef = useRef(new TapTempo());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }
      const st = useShowStore.getState();

      if (e.code === 'Space') {
        e.preventDefault();
        st.togglePlaying();
      } else if (e.code === 'KeyP') {
        st.setUi({ clean: !st.ui.clean, presentation: false });
      } else if (e.code === 'KeyO') {
        st.setUi({ presentation: !st.ui.presentation, clean: false });
      } else if (e.code === 'Escape') {
        st.setUi({ clean: false, presentation: false });
      } else if (e.code === 'KeyM') {
        st.setUi({ showMask: !st.ui.showMask });
      } else if (e.code === 'KeyG') {
        st.setUi({ ghost: !st.ui.ghost });
      } else if (e.code === 'KeyT') {
        const bpm = tapRef.current.tap();
        if (bpm) st.setBpm(bpm);
      } else if (e.code === 'KeyF' && !e.repeat) {
        st.setFlashHeld(true);
      } else if (e.code === 'KeyX') {
        st.swapDecks();
      } else if (e.code === 'BracketLeft') {
        st.setFader(st.mix.fader - 0.06);
      } else if (e.code === 'BracketRight') {
        st.setFader(st.mix.fader + 0.06);
      } else if (/^Digit[1-9]$/.test(e.code)) {
        const index = parseInt(e.code.slice(5), 10) - 1;
        if (e.shiftKey) st.loadPresetByIndex(index);
        else st.loadPresetToDeckBByIndex(index);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyF') {
        useShowStore.getState().setFlashHeld(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);
}
