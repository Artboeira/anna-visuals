import { useEffect, useRef, useState } from 'react';
import { useShowStore } from '../../store/showStore';
import { Slider } from '../ui/Slider';
import { ButtonGroup } from '../ui/ButtonGroup';
import {
  exportPNG,
  startRecording,
  EXPORT_TARGETS,
  type ExportTarget,
  type RecordingController,
} from '../../export/exporter';
import s from './sections.module.css';

/**
 * Saída — resolução interna do LED + emissão NDI/Syphon (wrapper Electron).
 * Pipeline: canvas interno → janela em modo apresentação →
 * webContents.beginFrameSubscription → BGRA → NDI/Syphon → Resolume.
 */

interface VJStatus {
  ndi: { available: boolean; running: boolean; error: string | null };
  syphon: { available: boolean; running: boolean; error: string | null };
  frame: { width: number; height: number };
  platform: string;
}

interface ElectronVJ {
  status(): Promise<VJStatus>;
  startNDI(name: string): Promise<{ ok: boolean; error: string | null }>;
  stopNDI(): Promise<{ ok: boolean }>;
  startSyphon(name: string): Promise<{ ok: boolean; error: string | null }>;
  stopSyphon(): Promise<{ ok: boolean }>;
  setOutputSize(width: number, height: number): Promise<{ ok: boolean }>;
}

declare global {
  interface Window {
    electronVJ?: ElectronVJ;
  }
}

const RESOLUTION_PRESETS: { label: string; w: number; h: number }[] = [
  { label: '6200 × 512 (slice Resolume — oficial)', w: 6200, h: 512 },
  { label: '2700 × 270 (1 px/cm)', w: 2700, h: 270 },
  { label: '1920 × 192', w: 1920, h: 192 },
  { label: '3840 × 384', w: 3840, h: 384 },
];

export function OutputSection() {
  const output = useShowStore((st) => st.output);
  const master = useShowStore((st) => st.master);
  const setOutput = useShowStore((st) => st.setOutput);
  const setMaster = useShowStore((st) => st.setMaster);

  const vj = window.electronVJ;
  const [status, setStatus] = useState<VJStatus | null>(null);
  const [sourceName, setSourceName] = useState('ANNA_LED');
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');

  const [exportTarget, setExportTarget] = useState<ExportTarget>('slice');
  const [durationSec, setDurationSec] = useState(10);
  const [recFps, setRecFps] = useState<30 | 60>(30);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const recorderRef = useRef<RecordingController | null>(null);

  const handleExportPNG = async () => {
    try {
      setExportStatus('Gerando PNG…');
      await exportPNG(exportTarget);
      setExportStatus('PNG exportado.');
    } catch (err) {
      setExportStatus(err instanceof Error ? err.message : 'Falha na exportação');
    }
  };

  const handleRecord = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      setRecording(true);
      setElapsed(0);
      setExportStatus('');
      const controller = startRecording({
        target: exportTarget,
        durationSec,
        fps: recFps,
        onProgress: (sec) => setElapsed(sec),
      });
      recorderRef.current = controller;
      setExportStatus(`Gravando (${controller.mimeType.includes('mp4') ? 'MP4/H.264' : 'WebM/VP9'})…`);
      await controller.done;
      setExportStatus('Vídeo exportado.');
    } catch (err) {
      setExportStatus(err instanceof Error ? err.message : 'Falha na gravação');
    } finally {
      setRecording(false);
      recorderRef.current = null;
    }
  };

  useEffect(() => {
    if (!vj) return;
    const refresh = async () => {
      try {
        setStatus(await vj.status());
      } catch {
        /* noop */
      }
    };
    refresh();
    const id = window.setInterval(refresh, 1500);
    return () => window.clearInterval(id);
  }, [vj]);

  const applyResolution = (w: number, h: number) => {
    setOutput({ internalWidth: w, internalHeight: h });
    vj?.setOutputSize(w, h).catch(() => undefined);
  };

  return (
    <>
      <div className={s.section}>
        <h3 className={s.sectionTitle}>Master</h3>
        <Slider
          label="Brightness (dimmer)"
          value={master.brightness}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => setMaster({ brightness: v })}
        />
        <ButtonGroup
          label="FPS alvo"
          options={[
            { label: '60', value: '60' },
            { label: '30', value: '30' },
          ]}
          value={String(output.fps)}
          onChange={(v) => setOutput({ fps: Number(v) as 30 | 60 })}
        />
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Resolução interna</h3>
        <div className={s.hint}>
          Painel físico 27,00 × 2,70 m. Saída oficial: slice "Panel" do
          Resolume, 6200×512 (refs/Ame_withpanel.xml). Para ensaiar leve,
          use 2700×270; a exportação renderiza sempre no alvo escolhido.
        </div>
        <div className={s.list}>
          {RESOLUTION_PRESETS.map((r) => (
            <button
              key={r.label}
              className={`${s.listItem} ${
                output.internalWidth === r.w && output.internalHeight === r.h
                  ? s.listItemActive
                  : ''
              }`}
              onClick={() => applyResolution(r.w, r.h)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className={s.row}>
          <input
            className={s.input}
            placeholder="Largura"
            inputMode="numeric"
            value={customW}
            onChange={(e) => setCustomW(e.target.value)}
          />
          <input
            className={s.input}
            placeholder="Altura"
            inputMode="numeric"
            value={customH}
            onChange={(e) => setCustomH(e.target.value)}
          />
          <button
            className={s.btn}
            onClick={() => {
              const w = parseInt(customW, 10);
              const h = parseInt(customH, 10);
              if (w > 0 && h > 0) applyResolution(w, h);
            }}
          >
            Aplicar
          </button>
        </div>
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Exportar — teste no Resolume</h3>
        <div className={s.hint}>
          Mapa oficial (refs/Ame_withpanel.xml): composição 6200×4600; o slice
          "Panel" lê a faixa 6200×512 no rodapé (y 4088). Render pixel-true na
          resolução do alvo.
        </div>
        <ButtonGroup
          label="Alvo"
          options={EXPORT_TARGETS.map((t) => ({ label: t.label, value: t.id }))}
          value={exportTarget}
          onChange={(v) => setExportTarget(v as ExportTarget)}
        />
        <div className={s.hint}>
          {EXPORT_TARGETS.find((t) => t.id === exportTarget)?.hint}
        </div>
        <button className={s.btn} onClick={handleExportPNG} disabled={recording}>
          Exportar imagem (PNG)
        </button>
        <Slider
          label="Duração do vídeo (s)"
          value={durationSec}
          min={2}
          max={60}
          step={1}
          onChange={(v) => setDurationSec(Math.round(v))}
        />
        <ButtonGroup
          label="FPS da gravação"
          options={[
            { label: '30', value: '30' },
            { label: '60', value: '60' },
          ]}
          value={String(recFps)}
          onChange={(v) => setRecFps(Number(v) as 30 | 60)}
        />
        <button
          className={`${s.btn} ${recording ? s.btnDanger : s.btnPrimary}`}
          onClick={handleRecord}
        >
          {recording
            ? `Gravando ${elapsed.toFixed(0)}s / ${durationSec}s — parar`
            : 'Gravar vídeo'}
        </button>
        {exportStatus && <div className={s.hint}>{exportStatus}</div>}
        <div className={s.hint}>
          Mantenha esta aba do navegador visível durante a gravação. Acima de
          4032 px de largura o arquivo sai em WebM/VP9 — se o Resolume não
          abrir direto, converta para DXV no Resolume Alley ou:
          ffmpeg -i clip.webm -c:v prores_ks -pix_fmt yuv422p clip.mov
        </div>
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>NDI / Syphon</h3>
        {!vj && (
          <div className={s.hint}>
            Emissão NDI/Syphon só no wrapper desktop — rode{' '}
            <span style={{ color: 'var(--ab-amber)' }}>npm run dev:electron</span>. No
            navegador este painel fica informativo.
          </div>
        )}
        {vj && !status && <div className={s.hint}>Conectando ao main process…</div>}
        {vj && status && (
          <>
            <input
              className={s.input}
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="Nome da fonte"
            />
            <div className={s.hint}>
              Frame {status.frame.width || '—'} × {status.frame.height || '—'} · captura na
              resolução da janela — use o modo saída (O).
            </div>
            <OutputRow
              label="NDI"
              sub="Resolume / rede"
              available={status.ndi.available}
              running={status.ndi.running}
              error={status.ndi.error}
              onToggle={async () => {
                if (status.ndi.running) await vj.stopNDI();
                else await vj.startNDI(sourceName);
                setStatus(await vj.status());
              }}
            />
            <OutputRow
              label="Syphon"
              sub={status.platform === 'darwin' ? 'macOS local' : 'apenas macOS'}
              available={status.syphon.available}
              running={status.syphon.running}
              error={status.syphon.error}
              onToggle={async () => {
                if (status.syphon.running) await vj.stopSyphon();
                else await vj.startSyphon(sourceName);
                setStatus(await vj.status());
              }}
            />
          </>
        )}
      </div>
    </>
  );
}

function OutputRow({
  label,
  sub,
  available,
  running,
  error,
  onToggle,
}: {
  label: string;
  sub: string;
  available: boolean;
  running: boolean;
  error: string | null;
  onToggle: () => void;
}) {
  return (
    <div>
      <div className={s.row}>
        <span style={{ flex: 1 }}>
          {label}{' '}
          <span style={{ color: 'var(--ab-fg-inv-muted)', fontSize: 10 }}>· {sub}</span>
        </span>
        <button
          className={`${s.btn} ${running ? s.btnPrimary : ''}`}
          disabled={!available}
          style={{ flex: '0 0 auto', opacity: available ? 1 : 0.4 }}
          onClick={onToggle}
        >
          {running ? 'Ao vivo' : available ? 'Iniciar' : 'Indisponível'}
        </button>
      </div>
      {error && (
        <div className={s.hint} style={{ color: 'var(--ab-garnet)' }}>
          {error}
        </div>
      )}
    </div>
  );
}
