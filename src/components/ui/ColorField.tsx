import { useEffect, useRef, useState } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import s from './ColorField.module.css';

/**
 * Campo de cor compacto: label + chip clicável que abre o picker.
 * Opcionalmente uma linha de presets rápidos.
 */

interface Props {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  presets?: { label: string; color: string }[];
}

export function ColorField({ label, value, onChange, presets }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [open]);

  return (
    <div ref={rootRef} className={s.root}>
      <div className={s.header}>
        <span className={s.label}>{label}</span>
        <button
          className={s.chip}
          style={{ background: value }}
          onClick={() => setOpen((v) => !v)}
          title={value.toUpperCase()}
        >
          <span className={s.hex}>{value.toUpperCase()}</span>
        </button>
      </div>

      {presets && (
        <div className={s.presets}>
          {presets.map((p) => (
            <button
              key={p.label}
              className={`${s.presetBtn} ${
                p.color.toLowerCase() === value.toLowerCase() ? s.presetActive : ''
              }`}
              onClick={() => onChange(p.color)}
            >
              <span className={s.presetSwatch} style={{ background: p.color }} />
              {p.label}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className={s.pickerWrap}>
          <HexColorPicker color={value} onChange={onChange} />
          <HexColorInput className={s.hexInput} color={value} onChange={onChange} prefixed />
        </div>
      )}
    </div>
  );
}
