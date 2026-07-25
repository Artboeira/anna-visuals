import { useShowStore } from '../../store/showStore';
import { Slider } from '../ui/Slider';
import { ButtonGroup } from '../ui/ButtonGroup';
import { ColorField } from '../ui/ColorField';
import s from './sections.module.css';

/** Hipóteses de acabamento da cenografia — a confirmar com a produção */
const MDF_PRESETS = [
  { label: 'Preto', color: '#131313' },
  { label: 'MDF branco', color: '#d8d3c8' },
  { label: 'Cru', color: '#b89a6a' },
  { label: 'Bark', color: '#453B32' },
  { label: 'Grafite', color: '#2e2e30' },
];

const AMBIENT_PRESETS = [
  { label: 'Âmbar palco', color: '#c98a3e' },
  { label: 'Tungstênio', color: '#e8ae6a' },
  { label: 'Neutra', color: '#b8b0a0' },
];

/**
 * Calibração da grade de cobogó contra o layout de referência.
 * Ghost mode (tecla G) desenha o LED_LAYOUT.jpeg semitransparente por cima —
 * ajuste os sliders até a grade procedural cobrir o padrão do corte.
 */
export function GridSection() {
  const gp = useShowStore((st) => st.gridParams);
  const ui = useShowStore((st) => st.ui);
  const setGridParams = useShowStore((st) => st.setGridParams);
  const setGlyphParams = useShowStore((st) => st.setGlyphParams);
  const resetGridParams = useShowStore((st) => st.resetGridParams);
  const setUi = useShowStore((st) => st.setUi);

  return (
    <>
      <div className={s.section}>
        <h3 className={s.sectionTitle}>Calibração</h3>
        <ButtonGroup
          label="Simulação do cobogó (M)"
          options={[
            { label: 'Visível', value: 'on' },
            { label: 'Oculta', value: 'off' },
          ]}
          value={ui.showMask ? 'on' : 'off'}
          onChange={(v) => setUi({ showMask: v === 'on' })}
        />
        <ButtonGroup
          label="Ghost do layout (G)"
          options={[
            { label: 'Visível', value: 'on' },
            { label: 'Oculto', value: 'off' },
          ]}
          value={ui.ghost ? 'on' : 'off'}
          onChange={(v) => setUi({ ghost: v === 'on' })}
        />
        <Slider
          label="Opacidade do ghost"
          value={ui.ghostAlpha}
          min={0.1}
          max={1}
          step={0.05}
          onChange={(v) => setUi({ ghostAlpha: v })}
        />
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Grade</h3>
        <Slider label="Linhas" value={gp.rows} min={2} max={10} step={1} onChange={(v) => setGridParams({ rows: v })} />
        <Slider label="Colunas" value={gp.cols} min={10} max={100} step={1} onChange={(v) => setGridParams({ cols: v })} />
        <Slider label="Margem horizontal" value={gp.marginX} min={0} max={0.5} step={0.005} onChange={(v) => setGridParams({ marginX: v })} />
        <Slider label="Margem vertical" value={gp.marginY} min={0} max={0.5} step={0.005} onChange={(v) => setGridParams({ marginY: v })} />
        <Slider label="Respiro horizontal" value={gp.gapX} min={0} max={0.6} step={0.01} onChange={(v) => setGridParams({ gapX: v })} />
        <Slider label="Respiro vertical" value={gp.gapY} min={0} max={0.6} step={0.01} onChange={(v) => setGridParams({ gapY: v })} />
        <ButtonGroup
          label="Fase do xadrez"
          options={[
            { label: 'Octógono em (0,0)', value: '0' },
            { label: 'Glifo em (0,0)', value: '1' },
          ]}
          value={String(gp.checkerPhase)}
          onChange={(v) => setGridParams({ checkerPhase: Number(v) as 0 | 1 })}
        />
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Forma das células</h3>
        <ButtonGroup
          label="Forma"
          options={[
            { label: 'Quadradinhos', value: 'quadrado' },
            { label: 'Silhueta (logo + octógono)', value: 'silhueta' },
          ]}
          value={gp.cellShape}
          onChange={(v) => setGridParams({ cellShape: v as 'quadrado' | 'silhueta' })}
        />
        <div className={s.hint}>
          Define o que as cenas PINTAM no LED. Quadradinhos preenchem toda a
          silhueta do corte real — não dependem de alinhamento fino. A
          simulação do cobogó (M) mostra sempre o corte real (logo +
          octógono), em qualquer modo. O xadrez de tipos continua valendo
          para as cenas (glifo em destaque, contraste por tipo).
        </div>
        {gp.cellShape === 'quadrado' && (
          <Slider
            label="Escala do quadrado"
            value={gp.squareScale}
            min={0.4}
            max={1.2}
            step={0.01}
            onChange={(v) => setGridParams({ squareScale: v })}
          />
        )}
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Octógono</h3>
        {gp.cellShape === 'quadrado' && (
          <div className={s.hint}>
            No modo quadradinhos, octógono e glifo moldam só a simulação do
            cobogó no preview (o corte físico real).
          </div>
        )}
        <Slider label="Chanfro" value={gp.octagonCut} min={0} max={0.5} step={0.01} onChange={(v) => setGridParams({ octagonCut: v })} />
        <Slider label="Escala" value={gp.octagonScale} min={0.4} max={1.2} step={0.01} onChange={(v) => setGridParams({ octagonScale: v })} />
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Glifo ANNA</h3>
        <div className={s.hint}>
          Geometria oficial do símbolo (refs/ANNA LOGO 2026_SYMBOL BLACK.svg) —
          barras com topo arredondado + losangos na base.
        </div>
        <Slider
          label="Escala do símbolo"
          value={gp.glyph.scale}
          min={0.4}
          max={1.2}
          step={0.01}
          onChange={(v) => setGlyphParams({ scale: v })}
        />
        <Slider
          label="Deslocamento vertical"
          value={gp.glyph.offsetY}
          min={-0.3}
          max={0.3}
          step={0.005}
          onChange={(v) => setGlyphParams({ offsetY: v })}
        />
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Cenografia no preview</h3>
        <ColorField
          label="Cor do cobogó (MDF)"
          value={gp.mdfColor}
          onChange={(mdfColor) => setGridParams({ mdfColor })}
          presets={MDF_PRESETS}
        />
        <ColorField
          label="Tinta da luz ambiente"
          value={gp.ambientTint}
          onChange={(ambientTint) => setGridParams({ ambientTint })}
          presets={AMBIENT_PRESETS}
        />
        <Slider
          label="Intensidade da luz ambiente"
          value={gp.ambientAmount}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => setGridParams({ ambientAmount: v })}
        />
        <div className={s.hint}>
          Só afeta a simulação do preview — nada disso vai para o LED. Com
          cobogó preto, suba a luz ambiente para conferir se a cenografia
          ainda desenha contra o visual.
        </div>
        <button className={`${s.btn} ${s.btnDanger}`} onClick={resetGridParams}>
          Restaurar calibração padrão
        </button>
        <div className={s.hint}>
          Quando o corte real (DXF/medidas) chegar da produtora, recalibre aqui
          contra o ghost — nenhuma cena precisa mudar.
        </div>
      </div>
    </>
  );
}
