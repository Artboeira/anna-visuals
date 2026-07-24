import { useState } from 'react';
import { useShowStore } from '../../store/showStore';
import { getScene } from '../../scenes/registry';
import { PALETTES } from '../../store/palettes';
import type { Palette } from '../../core/paletteTypes';
import { renderEngine } from '../../engine/RenderEngine';
import { GroupedParams } from '../ui/ParamControls';
import { Slider } from '../ui/Slider';
import { ButtonGroup } from '../ui/ButtonGroup';
import sec from './sections.module.css';
import s from './MesaSection.module.css';

/**
 * MESA — a superfície de operação do show.
 * Deck A = look vivo (o que está no LED); deck B = look preparado.
 * O crossfader mistura os dois; X troca; 1–9 carregam presets no B.
 * Abaixo, tudo que compõe um preset visível de uma vez:
 * parâmetros agrupados por tipo + paleta + master + salvar.
 */

function paletteCss(p: Palette): string {
  const sorted = [...p.stops].sort((a, b) => a.pos - b.pos);
  return `linear-gradient(to right, ${sorted
    .map((st) => `${st.color} ${Math.round(st.pos * 100)}%`)
    .join(', ')})`;
}

export function MesaSection() {
  const sceneId = useShowStore((st) => st.sceneId);
  const mix = useShowStore((st) => st.mix);
  const presets = useShowStore((st) => st.presets);
  const master = useShowStore((st) => st.master);
  const transition = useShowStore((st) => st.transition);
  const paletteId = useShowStore((st) => st.paletteId);
  const customPalettes = useShowStore((st) => st.customPalettes);
  const activePalette = useShowStore((st) =>
    [...PALETTES, ...st.customPalettes].find((p) => p.id === st.paletteId) ?? PALETTES[0],
  );

  const setFader = useShowStore((st) => st.setFader);
  const swapDecks = useShowStore((st) => st.swapDecks);
  const setDeckB = useShowStore((st) => st.setDeckB);
  const captureCurrentToDeckB = useShowStore((st) => st.captureCurrentToDeckB);
  const loadPresetToDeckB = useShowStore((st) => st.loadPresetToDeckB);
  const loadPreset = useShowStore((st) => st.loadPreset);
  const setPalette = useShowStore((st) => st.setPalette);
  const setMaster = useShowStore((st) => st.setMaster);
  const setTransition = useShowStore((st) => st.setTransition);
  const savePreset = useShowStore((st) => st.savePreset);

  const [presetName, setPresetName] = useState('');

  const sceneA = getScene(sceneId);
  const allPalettes = [...PALETTES, ...customPalettes];

  const handleSave = () => {
    const name = presetName.trim() || `Preset ${presets.length + 1}`;
    savePreset(name, renderEngine.captureThumbnail());
    setPresetName('');
  };

  return (
    <div className={s.mesa}>
      {/* ───── Decks + crossfader ───── */}
      <div className={s.decksBlock}>
        <div className={s.decks}>
          <div className={`${s.deck} ${mix.fader < 0.5 ? s.deckLive : ''}`}>
            <div className={s.deckHead}>
              <span className={s.deckLetter}>A</span>
              <span className={s.deckRole}>look vivo</span>
            </div>
            <div className={s.deckScene}>{sceneA.name}</div>
            <div className={s.deckPalette} style={{ background: paletteCss(activePalette) }} />
          </div>

          <button className={s.swapBtn} onClick={swapDecks} disabled={!mix.b} title="X">
            A ⇄ B
          </button>

          <div className={`${s.deck} ${mix.fader >= 0.5 ? s.deckLive : ''}`}>
            <div className={s.deckHead}>
              <span className={s.deckLetter}>B</span>
              <span className={s.deckRole}>{mix.b ? mix.b.name : 'vazio'}</span>
            </div>
            {mix.b ? (
              <>
                <div className={s.deckScene}>{getScene(mix.b.sceneId).name}</div>
                <div className={s.deckPalette} style={{ background: paletteCss(mix.b.palette) }} />
              </>
            ) : (
              <div className={s.deckEmpty}>1–9 carrega um preset aqui</div>
            )}
          </div>
        </div>

        <div className={s.faderRow}>
          <span className={s.faderLabel}>A</span>
          <input
            className={s.fader}
            type="range"
            min={0}
            max={1}
            step={0.005}
            value={mix.fader}
            onChange={(e) => setFader(Number(e.target.value))}
            disabled={!mix.b}
          />
          <span className={s.faderLabel}>B</span>
        </div>

        <div className={s.deckActions}>
          <button className={sec.btn} onClick={captureCurrentToDeckB}>
            Atual → B
          </button>
          <button className={sec.btn} onClick={() => setFader(mix.fader < 0.5 ? 1 : 0)} disabled={!mix.b}>
            Corte seco
          </button>
          <button className={sec.btn} onClick={() => setDeckB(null)} disabled={!mix.b}>
            Limpar B
          </button>
        </div>
      </div>

      {/* ───── Banco de presets ───── */}
      <div className={s.bank}>
        <div className={s.bankHeader}>
          <span>Banco — clique carrega no B · Shift+clique aplica no A</span>
        </div>
        <div className={s.bankGrid}>
          {presets.map((p, i) => (
            <button
              key={p.id}
              className={s.bankCard}
              onClick={(e) => (e.shiftKey ? loadPreset(p.id) : loadPresetToDeckB(p.id))}
              title={p.name}
            >
              <img className={s.bankThumb} src={p.thumbnail} alt="" />
              <span className={s.bankName}>
                {i < 9 && <span className={s.bankIndex}>{i + 1}</span>}
                {p.name}
              </span>
            </button>
          ))}
          {presets.length === 0 && (
            <div className={sec.hint}>
              Sem presets ainda — monte um look abaixo e salve.
            </div>
          )}
        </div>
      </div>

      {/* ───── Look ativo: tudo que compõe o preset ───── */}
      <div className={s.columns}>
        <div className={s.col}>
          <div className={s.colTitle}>Parâmetros — {sceneA.name}</div>
          <GroupedParams sceneId={sceneId} />
        </div>

        <div className={s.col}>
          <div className={s.colTitle}>Paleta</div>
          <div className={s.paletteGrid}>
            {allPalettes.map((p) => (
              <button
                key={p.id}
                className={`${s.paletteChip} ${p.id === paletteId ? s.paletteChipActive : ''}`}
                style={{ background: paletteCss(p) }}
                onClick={() => setPalette(p.id)}
                title={p.name}
              />
            ))}
          </div>

          <div className={s.colTitle}>Master</div>
          <Slider
            label="Brightness"
            value={master.brightness}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setMaster({ brightness: v })}
          />
          <Slider
            label="Velocidade"
            value={master.speed}
            min={0.1}
            max={4}
            step={0.05}
            onChange={(v) => setMaster({ speed: v })}
          />
          <ButtonGroup
            label="Transição (cena A)"
            options={[
              { label: 'Crossfade', value: 'crossfade' },
              { label: 'Slide', value: 'slide' },
            ]}
            value={transition.mode}
            onChange={(mode) => setTransition({ mode: mode as 'crossfade' | 'slide' })}
          />
          <Slider
            label="Duração (s)"
            value={transition.durationMs / 1000}
            min={0}
            max={10}
            step={0.1}
            onChange={(v) => setTransition({ durationMs: Math.round(v * 1000) })}
          />

          <div className={s.colTitle}>Salvar look como preset</div>
          <div className={sec.row}>
            <input
              className={sec.input}
              placeholder="Nome do preset"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <button className={`${sec.btn} ${sec.btnPrimary}`} onClick={handleSave}>
              Salvar
            </button>
          </div>
          <div className={sec.hint}>
            O preset captura o look vivo (A): cena, parâmetros, paleta, master e BPM.
          </div>
        </div>
      </div>
    </div>
  );
}
