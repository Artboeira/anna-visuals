import { useRef, useState, useCallback, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import chroma from 'chroma-js';
import type { ColorStop } from '../../core/paletteTypes';
import s from './ColorStopEditor.module.css';

/**
 * Editor de stops de gradiente — copiado do gradient_system,
 * adaptado para o ColorStop de core/paletteTypes.
 */

interface Props {
  stops: ColorStop[];
  onChange: (stops: ColorStop[]) => void;
}

let idCounter = 0;
function genId(): string {
  return `cs-${Date.now()}-${idCounter++}`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function interpolateColor(pos: number, stops: ColorStop[]): string {
  const sorted = [...stops].sort((a, b) => a.pos - b.pos);
  if (pos <= sorted[0].pos) return sorted[0].color;
  if (pos >= sorted[sorted.length - 1].pos) return sorted[sorted.length - 1].color;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (pos >= a.pos && pos <= b.pos) {
      const t = (pos - a.pos) / (b.pos - a.pos);
      return chroma.mix(a.color, b.color, t, 'lab').hex();
    }
  }
  return stops[0].color;
}

export function ColorStopEditor({ stops, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sorted = [...stops].sort((a, b) => a.pos - b.pos);
  const gradientCss = sorted
    .map((st) => `${st.color} ${Math.round(st.pos * 100)}%`)
    .join(', ');

  useEffect(() => {
    function handleOutside(e: PointerEvent) {
      if (!pickerRef.current) return;
      if (!pickerRef.current.contains(e.target as Node)) {
        setSelectedId(null);
      }
    }
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, []);

  const getPosFromEvent = useCallback((e: React.PointerEvent): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return clamp((e.clientX - rect.left) / rect.width, 0, 1);
  }, []);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (draggingId) return;
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pos = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const color = interpolateColor(pos, stops);
      const newStop: ColorStop = { id: genId(), pos, color };
      onChange([...stops, newStop]);
    },
    [draggingId, stops, onChange],
  );

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingId(id);
    setSelectedId(id);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (draggingId !== id) return;
      const pos = getPosFromEvent(e);
      onChange(stops.map((st) => (st.id === id ? { ...st, pos } : st)));
    },
    [draggingId, stops, onChange, getPosFromEvent],
  );

  const handlePointerUp = useCallback(() => {
    setDraggingId(null);
    onChange([...stops].sort((a, b) => a.pos - b.pos));
  }, [stops, onChange]);

  const handleRemove = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (stops.length <= 2) return;
      onChange(stops.filter((st) => st.id !== id));
      setSelectedId(null);
    },
    [stops, onChange],
  );

  const handleColorChange = useCallback(
    (color: string) => {
      if (!selectedId) return;
      onChange(stops.map((st) => (st.id === selectedId ? { ...st, color } : st)));
    },
    [selectedId, stops, onChange],
  );

  const selectedStop = stops.find((st) => st.id === selectedId);

  return (
    <div className={s.root}>
      <div
        ref={trackRef}
        className={s.track}
        style={{ background: `linear-gradient(to right, ${gradientCss})` }}
        onClick={handleTrackClick}
      >
        {stops.map((stop) => (
          <div
            key={stop.id}
            className={`${s.handle} ${selectedId === stop.id ? s.selected : ''}`}
            style={{ left: `${stop.pos * 100}%`, background: stop.color }}
            onPointerDown={(e) => handlePointerDown(e, stop.id)}
            onPointerMove={(e) => handlePointerMove(e, stop.id)}
            onPointerUp={handlePointerUp}
            onClick={(e) => e.stopPropagation()}
          >
            {selectedId === stop.id && stops.length > 2 && (
              <button
                className={s.removeBtn}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => handleRemove(e, stop.id)}
                title="Remover stop"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {selectedStop && (
        <div ref={pickerRef} className={s.pickerWrap}>
          <HexColorPicker color={selectedStop.color} onChange={handleColorChange} />
          <div className={s.hexLabel}>{selectedStop.color.toUpperCase()}</div>
        </div>
      )}
    </div>
  );
}
