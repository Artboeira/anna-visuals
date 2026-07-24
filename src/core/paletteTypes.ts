/**
 * Tipos de cor compartilhados por todo o sistema.
 * Formato de stops compatível com o gradient_system (pos 0..1 + hex).
 */

export interface ColorStop {
  id: string;
  pos: number; // 0..1
  color: string; // hex
}

export type ColorSpace = 'lab' | 'rgb' | 'hsl' | 'lch';

export type PaletteCluster = 'warm-core' | 'ember' | 'accent' | 'custom';

export interface Palette {
  id: string;
  name: string;
  stops: ColorStop[];
  colorSpace: ColorSpace;
  cluster: PaletteCluster;
}
