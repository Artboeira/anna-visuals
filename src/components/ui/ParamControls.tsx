import { useShowStore } from '../../store/showStore';
import { getScene } from '../../scenes/registry';
import { PARAM_GROUPS } from '../../scenes/types';
import type { ParamSpec } from '../../scenes/types';
import { Slider } from './Slider';
import { ButtonGroup } from './ButtonGroup';
import s from './ParamControls.module.css';

/**
 * Controles de parâmetro gerados do paramsSchema, agrupados por tipo
 * (MOVIMENTO / COR / FORMA / BEAT / NÍVEL) — o mesmo vocabulário em
 * qualquer cena, para montar presets com consistência.
 */

export function ParamControl({
  spec,
  value,
  onChange,
}: {
  spec: ParamSpec;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (spec.type === 'number') {
    return (
      <Slider
        label={spec.label}
        value={typeof value === 'number' ? value : spec.default}
        min={spec.min}
        max={spec.max}
        step={spec.step ?? 0.01}
        onChange={onChange}
      />
    );
  }
  if (spec.type === 'select') {
    return (
      <ButtonGroup
        label={spec.label}
        options={spec.options}
        value={typeof value === 'string' ? value : spec.default}
        onChange={onChange}
      />
    );
  }
  return (
    <ButtonGroup
      label={spec.label}
      options={[
        { label: 'Ligado', value: 'on' },
        { label: 'Desligado', value: 'off' },
      ]}
      value={(typeof value === 'boolean' ? value : spec.default) ? 'on' : 'off'}
      onChange={(v) => onChange(v === 'on')}
    />
  );
}

export function GroupedParams({ sceneId }: { sceneId: string }) {
  const params = useShowStore((st) => st.sceneParams[sceneId]);
  const setSceneParam = useShowStore((st) => st.setSceneParam);
  const scene = getScene(sceneId);

  return (
    <div className={s.groups}>
      {PARAM_GROUPS.map((group) => {
        const specs = scene.paramsSchema.filter(
          (spec: ParamSpec) => (spec.group ?? 'forma') === group.id,
        );
        if (specs.length === 0) return null;
        return (
          <div key={group.id} className={s.group}>
            <div className={s.groupHeader}>
              <span>{group.label}</span>
              <span className={s.groupRule} />
            </div>
            {specs.map((spec: ParamSpec) => (
              <ParamControl
                key={spec.key}
                spec={spec}
                value={params?.[spec.key]}
                onChange={(v) => setSceneParam(sceneId, spec.key, v)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
