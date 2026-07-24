import type { CobogoCell, CobogoGrid, CellType, GridParams } from './types';
import { PANEL_COUNT } from './types';
import { buildOctagonPath, buildGlyphPath } from './glyphPath';

/**
 * Gera a grade de cobogó procedural para uma resolução interna.
 * O padrão é contínuo pelos 27 m — NÃO alinha com as divisas dos painéis
 * (0,925 m ≈ 1,7 colunas por painel); as fronteiras ficam em `panels`.
 */
export function buildCobogoGrid(params: GridParams, width: number, height: number): CobogoGrid {
  const mx = params.marginX * height; // margens em fração da altura: unidade estável no 10:1
  const my = params.marginY * height;

  const cellW = (width - 2 * mx) / params.cols;
  const cellH = (height - 2 * my) / params.rows;

  const usableW = cellW * (1 - params.gapX);
  const usableH = cellH * (1 - params.gapY);

  const panelW = width / PANEL_COUNT;

  const cells: CobogoCell[] = [];
  const byType: Record<CellType, CobogoCell[]> = { octagon: [], glyph: [] };

  for (let row = 0; row < params.rows; row++) {
    for (let col = 0; col < params.cols; col++) {
      const cx = mx + (col + 0.5) * cellW;
      const cy = my + (row + 0.5) * cellH;
      const type: CellType =
        (row + col + params.checkerPhase) % 2 === 0 ? 'octagon' : 'glyph';

      const path =
        type === 'octagon'
          ? buildOctagonPath(
              cx,
              cy,
              usableW * params.octagonScale,
              usableH * params.octagonScale,
              params.octagonCut,
            )
          : buildGlyphPath(cx, cy, usableW, usableH, params.glyph);

      const cell: CobogoCell = {
        row,
        col,
        cx,
        cy,
        w: usableW,
        h: usableH,
        type,
        panelIndex: Math.min(PANEL_COUNT - 1, Math.floor(cx / panelW)),
        path,
      };
      cells.push(cell);
      byType[type].push(cell);
    }
  }

  const panels = Array.from({ length: PANEL_COUNT }, (_, index) => ({
    index,
    x0: index * panelW,
    x1: (index + 1) * panelW,
  }));

  return {
    width,
    height,
    cellW,
    cellH,
    cells,
    byType,
    panels,
    params,
  };
}
