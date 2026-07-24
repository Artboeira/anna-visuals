import s from './Slider.module.css';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

export function Slider({ label, value, min, max, step, onChange, format }: SliderProps) {
  // Defensivo: um valor não-numérico (estado velho após migração de shape)
  // não pode derrubar o painel inteiro
  const safe = Number.isFinite(value) ? value : min;
  const display = format ? format(safe) : safe.toFixed(step < 0.1 ? 2 : 0);
  return (
    <div className={s.wrapper}>
      <div className={s.header}>
        <span className={s.label}>{label}</span>
        <span className={s.value}>{display}</span>
      </div>
      <input
        className={s.input}
        type="range"
        min={min}
        max={max}
        step={step}
        value={safe}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
