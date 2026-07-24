import { useMemo, useState } from 'react';
import { useShowStore } from '../../store/showStore';
import { PALETTES, CLUSTER_LABELS } from '../../store/palettes';
import type { Palette, PaletteCluster } from '../../core/paletteTypes';
import { ColorStopEditor } from '../ui/ColorStopEditor';
import s from './sections.module.css';

/**
 * Paletas curadas do show + paletas custom (editor de stops + picker).
 */

function paletteCss(p: Palette): string {
  const sorted = [...p.stops].sort((a, b) => a.pos - b.pos);
  return `linear-gradient(to right, ${sorted
    .map((st) => `${st.color} ${Math.round(st.pos * 100)}%`)
    .join(', ')})`;
}

let customCounter = 0;

export function PaletteSection() {
  const paletteId = useShowStore((st) => st.paletteId);
  const customPalettes = useShowStore((st) => st.customPalettes);
  const setPalette = useShowStore((st) => st.setPalette);
  const addCustomPalette = useShowStore((st) => st.addCustomPalette);
  const updateCustomPalette = useShowStore((st) => st.updateCustomPalette);
  const removeCustomPalette = useShowStore((st) => st.removeCustomPalette);
  const activePalette = useShowStore((st) =>
    [...PALETTES, ...st.customPalettes].find((p) => p.id === st.paletteId) ?? PALETTES[0],
  );

  const [renaming, setRenaming] = useState('');

  const clusters = useMemo(() => {
    const groups: { cluster: PaletteCluster; items: Palette[] }[] = [];
    for (const cluster of ['warm-core', 'ember', 'accent'] as PaletteCluster[]) {
      groups.push({ cluster, items: PALETTES.filter((p) => p.cluster === cluster) });
    }
    return groups;
  }, []);

  const isCustom = activePalette.cluster === 'custom';

  const duplicateAsCustom = () => {
    const copy: Palette = {
      ...activePalette,
      id: `custom-${Date.now()}-${customCounter++}`,
      name: `${activePalette.name} *`,
      cluster: 'custom',
      stops: activePalette.stops.map((st, i) => ({ ...st, id: `cs-dup-${Date.now()}-${i}` })),
    };
    addCustomPalette(copy);
    setPalette(copy.id);
  };

  return (
    <>
      <div className={s.section}>
        <h3 className={s.sectionTitle}>Paletas do show</h3>
        {clusters.map(({ cluster, items }) => (
          <div key={cluster}>
            <div className={s.clusterLabel}>{CLUSTER_LABELS[cluster]}</div>
            <div className={s.list} style={{ marginTop: 4 }}>
              {items.map((p) => (
                <div
                  key={p.id}
                  className={`${s.swatch} ${p.id === paletteId ? s.swatchActive : ''}`}
                  style={{ background: paletteCss(p) }}
                  onClick={() => setPalette(p.id)}
                >
                  <span className={s.swatchName}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {customPalettes.length > 0 && (
          <div>
            <div className={s.clusterLabel}>{CLUSTER_LABELS.custom}</div>
            <div className={s.list} style={{ marginTop: 4 }}>
              {customPalettes.map((p) => (
                <div
                  key={p.id}
                  className={`${s.swatch} ${p.id === paletteId ? s.swatchActive : ''}`}
                  style={{ background: paletteCss(p) }}
                  onClick={() => setPalette(p.id)}
                >
                  <span className={s.swatchName}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Editar cor</h3>
        {!isCustom && (
          <>
            <div className={s.hint}>
              Paletas curadas são somente-leitura. Duplique para editar os stops.
            </div>
            <button className={s.btn} onClick={duplicateAsCustom}>
              Duplicar como custom
            </button>
          </>
        )}
        {isCustom && (
          <>
            <ColorStopEditor
              stops={activePalette.stops}
              onChange={(stops) => updateCustomPalette({ ...activePalette, stops })}
            />
            <div className={s.row}>
              <input
                className={s.input}
                placeholder={activePalette.name}
                value={renaming}
                onChange={(e) => setRenaming(e.target.value)}
              />
              <button
                className={s.btn}
                onClick={() => {
                  if (renaming.trim()) {
                    updateCustomPalette({ ...activePalette, name: renaming.trim() });
                    setRenaming('');
                  }
                }}
              >
                Renomear
              </button>
            </div>
            <button
              className={`${s.btn} ${s.btnDanger}`}
              onClick={() => removeCustomPalette(activePalette.id)}
            >
              Excluir paleta
            </button>
          </>
        )}
        <div className={s.hint}>
          Zero preto: mantenha o stop mais escuro com matiz — o cobogó nunca apaga.
        </div>
      </div>
    </>
  );
}
