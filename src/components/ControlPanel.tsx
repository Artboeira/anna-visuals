import { useRef } from 'react';
import { useShowStore } from '../store/showStore';
import { TapTempo } from '../core/timing';
import { MesaSection } from './sections/MesaSection';
import { SceneSection } from './sections/SceneSection';
import { PaletteSection } from './sections/PaletteSection';
import { GridSection } from './sections/GridSection';
import { PresetsSection } from './sections/PresetsSection';
import { OutputSection } from './sections/OutputSection';
import s from './ControlPanel.module.css';

const TABS = [
  { id: 'mesa', label: 'Mesa' },
  { id: 'cena', label: 'Cena' },
  { id: 'cor', label: 'Cor' },
  { id: 'grade', label: 'Grade' },
  { id: 'presets', label: 'Presets' },
  { id: 'output', label: 'Saída' },
] as const;

export function ControlPanel() {
  const activeTab = useShowStore((st) => st.ui.activeTab);
  const bpm = useShowStore((st) => st.bpm);
  const playing = useShowStore((st) => st.playing);
  const setUi = useShowStore((st) => st.setUi);
  const setBpm = useShowStore((st) => st.setBpm);
  const togglePlaying = useShowStore((st) => st.togglePlaying);

  const tapRef = useRef(new TapTempo());

  return (
    <aside className={`${s.panel} ${activeTab === 'mesa' ? s.panelWide : ''}`}>
      <header className={s.header}>
        <div className={s.brandRow}>
          <span className={s.brand}>ANNA</span>
          <span className={s.brandSub}>LED VISUALS</span>
          <svg
            className={s.abLogo}
            viewBox="0 0 5000 5000"
            fill="currentColor"
            fillRule="evenodd"
            aria-label="Estúdio AB"
          >
            <polygon points="818 1888.36 818 2500 1735.45 2500 1735.45 2805.82 818 3723.27 818 2500 206.36 2500 206.36 4334.91 818 4334.91 1123.82 4334.91 1735.45 3723.27 1735.45 4334.91 2347.09 4334.91 2347.09 2500 2347.09 1888.36 818 1888.36" />
            <polygon points="4182 2500 4182 3723.27 3264.55 2805.82 3264.55 2500 4182 2500 4182 1888.36 3264.55 1888.36 3264.55 665.09 2652.91 665.09 2652.91 4334.91 3264.55 4334.91 3264.55 3723.27 3876.18 4334.91 4182 4334.91 4793.64 4334.91 4793.64 2500 4182 2500" />
          </svg>
        </div>
        <div className={s.transport}>
          <button
            className={`${s.transportBtn} ${playing ? s.transportActive : ''}`}
            onClick={togglePlaying}
            title="Espaço"
          >
            {playing ? 'Pausar' : 'Tocar'}
          </button>
          <div className={s.bpmBox}>
            <input
              className={s.bpmInput}
              type="number"
              min={60}
              max={200}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
            />
            <span className={s.bpmLabel}>BPM</span>
          </div>
          <button
            className={s.transportBtn}
            title="T"
            onClick={() => {
              const v = tapRef.current.tap();
              if (v) setBpm(v);
            }}
          >
            Tap
          </button>
        </div>
      </header>

      <nav className={s.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${s.tab} ${activeTab === tab.id ? s.tabActive : ''}`}
            onClick={() => setUi({ activeTab: tab.id })}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={s.content}>
        {activeTab === 'mesa' && <MesaSection />}
        {activeTab === 'cena' && <SceneSection />}
        {activeTab === 'cor' && <PaletteSection />}
        {activeTab === 'grade' && <GridSection />}
        {activeTab === 'presets' && <PresetsSection />}
        {activeTab === 'output' && <OutputSection />}
      </div>

      <footer className={s.footer}>
        <span>ESPAÇO tocar · P palco · O saída · M cobogó · G ghost · T tap · F flash</span>
        <span>1–9 preset → deck B · SHIFT+1–9 aplica · [ ] fader · X troca A⇄B</span>
      </footer>
    </aside>
  );
}
