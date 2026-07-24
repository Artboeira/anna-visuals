import s from './ButtonGroup.module.css';

interface Option<T> {
  label: string;
  value: T;
}

interface ButtonGroupProps<T> {
  label?: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function ButtonGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: ButtonGroupProps<T>) {
  return (
    <div className={s.wrapper}>
      {label && <span className={s.label}>{label}</span>}
      <div className={s.group}>
        {options.map((opt) => (
          <button
            key={opt.value}
            className={`${s.btn} ${opt.value === value ? s.active : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
