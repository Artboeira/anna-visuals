import { useState } from 'react';
import { useShowStore } from '../../store/showStore';
import { renderEngine } from '../../engine/RenderEngine';
import { exportShowFile, pickAndImportShowFile } from '../../store/presetsFileSystem';
import s from './sections.module.css';

/**
 * Presets do show: cena + params + paleta + master + BPM.
 * Teclas 1–9 carregam pela ordem da lista.
 */
export function PresetsSection() {
  const presets = useShowStore((st) => st.presets);
  const gridParams = useShowStore((st) => st.gridParams);
  const savePreset = useShowStore((st) => st.savePreset);
  const loadPreset = useShowStore((st) => st.loadPreset);
  const deletePreset = useShowStore((st) => st.deletePreset);
  const importPresets = useShowStore((st) => st.importPresets);
  const setGridParams = useShowStore((st) => st.setGridParams);

  const [name, setName] = useState('');
  const [status, setStatus] = useState('');

  const handleSave = () => {
    const trimmed = name.trim() || `Preset ${presets.length + 1}`;
    savePreset(trimmed, renderEngine.captureThumbnail());
    setName('');
  };

  const handleImport = async () => {
    try {
      const file = await pickAndImportShowFile();
      importPresets(file.presets);
      if (file.gridParams) setGridParams(file.gridParams);
      setStatus(`Importados ${file.presets.length} presets`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Falha na importação');
    }
  };

  return (
    <>
      <div className={s.section}>
        <h3 className={s.sectionTitle}>Salvar preset</h3>
        <div className={s.row}>
          <input
            className={s.input}
            placeholder="Nome do preset"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={handleSave}>
            Salvar
          </button>
        </div>
        <div className={s.hint}>
          O preset captura cena, parâmetros, paleta, master e BPM. Teclas 1–9
          carregam os nove primeiros ao vivo.
        </div>
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Presets ({presets.length})</h3>
        <div className={s.presetGrid}>
          {presets.map((p, i) => (
            <div key={p.id} className={s.presetCard} onClick={() => loadPreset(p.id)}>
              <img className={s.presetThumb} src={p.thumbnail} alt={p.name} />
              <div className={s.presetName}>
                <span>
                  {i < 9 && <span className={s.presetIndex}>{i + 1} </span>}
                  {p.name}
                </span>
                <button
                  className={s.presetDelete}
                  title="Excluir"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePreset(p.id);
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        {presets.length === 0 && <div className={s.hint}>Nenhum preset salvo ainda.</div>}
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Arquivo do show</h3>
        <div className={s.row}>
          <button className={s.btn} onClick={() => exportShowFile(presets, gridParams)}>
            Exportar JSON
          </button>
          <button className={s.btn} onClick={handleImport}>
            Importar JSON
          </button>
        </div>
        {status && <div className={s.hint}>{status}</div>}
        <div className={s.hint}>
          O arquivo leva presets + calibração da grade — autossuficiente para
          restaurar o show em outra máquina.
        </div>
      </div>
    </>
  );
}
