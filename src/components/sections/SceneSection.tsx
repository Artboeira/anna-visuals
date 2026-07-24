import { useShowStore } from '../../store/showStore';
import { SCENES, getScene } from '../../scenes/registry';
import { GroupedParams } from '../ui/ParamControls';
import { Slider } from '../ui/Slider';
import { ButtonGroup } from '../ui/ButtonGroup';
import s from './sections.module.css';

/**
 * Seleção de cena + parâmetros agrupados por tipo (mesmo vocabulário da MESA).
 */
export function SceneSection() {
  const sceneId = useShowStore((st) => st.sceneId);
  const transition = useShowStore((st) => st.transition);
  const master = useShowStore((st) => st.master);
  const setScene = useShowStore((st) => st.setScene);
  const resetSceneParams = useShowStore((st) => st.resetSceneParams);
  const setTransition = useShowStore((st) => st.setTransition);
  const setMaster = useShowStore((st) => st.setMaster);

  const scene = getScene(sceneId);

  return (
    <>
      <div className={s.section}>
        <h3 className={s.sectionTitle}>Cena</h3>
        <div className={s.list}>
          {SCENES.map((sc) => (
            <button
              key={sc.id}
              className={`${s.listItem} ${sc.id === sceneId ? s.listItemActive : ''}`}
              onClick={() => setScene(sc.id)}
            >
              <span style={{ flex: 1 }}>{sc.name}</span>
              {sc.gridAware && <span className={s.tag}>grade</span>}
            </button>
          ))}
        </div>
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Parâmetros — {scene.name}</h3>
        <GroupedParams sceneId={sceneId} />
        <button className={s.btn} onClick={() => resetSceneParams(sceneId)}>
          Restaurar padrões
        </button>
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Transição / Velocidade</h3>
        <ButtonGroup
          label="Modo de transição"
          options={[
            { label: 'Crossfade', value: 'crossfade' },
            { label: 'Slide', value: 'slide' },
          ]}
          value={transition.mode}
          onChange={(mode) => setTransition({ mode: mode as 'crossfade' | 'slide' })}
        />
        <Slider
          label="Duração da transição (s)"
          value={transition.durationMs / 1000}
          min={0}
          max={10}
          step={0.1}
          onChange={(v) => setTransition({ durationMs: Math.round(v * 1000) })}
        />
        <Slider
          label="Velocidade master"
          value={master.speed}
          min={0.1}
          max={4}
          step={0.05}
          onChange={(v) => setMaster({ speed: v })}
        />
      </div>
    </>
  );
}
