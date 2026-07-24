import { useEffect } from 'react';
import { useShowStore, IS_OUTPUT_WINDOW } from './store/showStore';
import { PreviewStage } from './components/PreviewStage';
import { ControlPanel } from './components/ControlPanel';
import { useKeyboard } from './hooks/useKeyboard';
import { startControlSync, startOutputSync } from './sync/windowSync';
import s from './App.module.css';

export default function App() {
  useKeyboard();
  const presentation = useShowStore((st) => st.ui.presentation);
  const clean = useShowStore((st) => st.ui.clean);

  // Duas janelas, um estado: a de controle publica, a de saída aplica
  useEffect(() => {
    if (IS_OUTPUT_WINDOW) startOutputSync();
    else startControlSync();
  }, []);

  if (IS_OUTPUT_WINDOW || presentation || clean) {
    // Janela de saída (?output=1) / Saída (O): frame cru — capturado p/ o LED.
    // Palco (P): preview limpo em tela cheia, 10:1 com cobogó.
    return <PreviewStage />;
  }

  return (
    <div className={s.app}>
      <div className={s.stageColumn}>
        <div className={s.hairline}>
          <span>ESTÚDIO AB</span>
          <span>ANNA — PALCO LED 27,00 × 2,70</span>
        </div>
        <PreviewStage />
        <div className={s.hairline}>
          <span>COBOGÓ 29 PAINÉIS MDF · CORTE VAZADO</span>
          <span>SÃO PAULO 2026</span>
        </div>
      </div>
      <ControlPanel />
    </div>
  );
}
