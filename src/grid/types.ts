/**
 * Modelo da máscara de cobogó — a cenografia de MDF vazado na frente do LED.
 * 29 painéis de 0,925 × 2,70 m formando uma faixa de 27,00 × 2,70 m.
 * Grade xadrez alternando octógonos e o glifo/monograma da Anna.
 *
 * A grade é procedural e calibrável: quando o corte real (DXF/medidas)
 * chegar da produtora, ajusta-se por sliders contra o ghost do layout.
 */

export type CellType = 'octagon' | 'glyph';

/**
 * Forma desenhada em cada célula:
 * - 'quadrado': grid de quadradinhos — cobre toda a silhueta do corte real,
 *   qualquer que seja o desvio de alinhamento (decisão do teste no painel);
 * - 'silhueta': logo ANNA + octógono (xadrez), para quando o alinhamento
 *   com a cenografia estiver calibrado.
 */
export type CellShape = 'quadrado' | 'silhueta';

/**
 * O glifo agora é o símbolo oficial ANNA 2026 (refs/ANNA LOGO 2026_SYMBOL
 * BLACK.svg), com geometria fixa — restam só escala e ajuste vertical.
 */
export interface GlyphParams {
  /** escala do símbolo dentro da área útil da célula (0..1.2) */
  scale: number;
  /** deslocamento vertical, fração da célula (-0.3..0.3) */
  offsetY: number;
}

export interface GridParams {
  rows: number; // default 6
  cols: number; // default 54
  /** forma desenhada nas células (o xadrez de TIPOS continua nos dois modos) */
  cellShape: CellShape;
  /** escala do quadradinho na célula útil; >1 transborda p/ garantir cobertura (0.4..1.2) */
  squareScale: number;
  /** margem horizontal, fração da ALTURA do canvas (unidade estável p/ 10:1) */
  marginX: number;
  /** margem vertical, fração da altura do canvas */
  marginY: number;
  /** respiro entre células — fração do tamanho da célula que fica sólida */
  gapX: number;
  gapY: number;
  /** chanfro do octógono, 0 = quadrado, 0.5 = losango (0..0.5) */
  octagonCut: number;
  /** escala do octógono dentro da célula útil (0..1) */
  octagonScale: number;
  glyph: GlyphParams;
  /** qual tipo de célula ocupa (row=0, col=0): 0 = octógono, 1 = glifo */
  checkerPhase: 0 | 1;
  /** cor do MDF na simulação do preview */
  mdfColor: string;
  /** tinta da luz ambiente quente sobre o MDF no preview */
  ambientTint: string;
  /** intensidade da luz ambiente no preview (0..1) */
  ambientAmount: number;
}

export interface CobogoCell {
  row: number;
  col: number;
  /** centro da célula em px do canvas interno */
  cx: number;
  cy: number;
  /** tamanho útil (já descontado o gap) em px */
  w: number;
  h: number;
  type: CellType;
  /** em qual dos 29 painéis de MDF o centro da célula cai (0..28) */
  panelIndex: number;
  /** geometria pronta para fill/clip, em coordenadas absolutas do canvas */
  path: Path2D;
}

export interface CobogoGrid {
  /** resolução interna para a qual a grade foi gerada */
  width: number;
  height: number;
  /** pitch da célula (célula + gap) em px */
  cellW: number;
  cellH: number;
  cells: CobogoCell[];
  byType: Record<CellType, CobogoCell[]>;
  /** fronteiras dos 29 painéis de MDF (para efeitos por painel) */
  panels: { index: number; x0: number; x1: number }[];
  params: GridParams;
}

export const PANEL_COUNT = 29;

export const DEFAULT_GRID_PARAMS: GridParams = {
  rows: 6,
  cols: 54,
  // Quadradinhos por padrão: no painel real, alinhar a silhueta logo/octógono
  // com o corte é impraticável — quadrados garantem preencher toda a máscara.
  cellShape: 'quadrado',
  squareScale: 1.0,
  marginX: 0,
  marginY: 0,
  gapX: 0.18,
  gapY: 0.18,
  octagonCut: 0.28,
  octagonScale: 1.0,
  // Símbolo oficial em ~92% da área útil — próximo da proporção do corte
  // no LED_LAYOUT.jpeg; ajuste fino contra o ghost na aba GRADE
  glyph: {
    scale: 0.92,
    offsetY: 0,
  },
  checkerPhase: 1, // glifo ANNA em (0,0)
  // Hipótese atual da produção: cobogó preto. Testável na aba GRADE.
  mdfColor: '#131313',
  ambientTint: '#c98a3e',
  ambientAmount: 0.45,
};
