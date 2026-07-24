import { saveAs } from 'file-saver';
import type { ShowPreset } from './showStore';
import type { GridParams } from '../grid/types';

/**
 * Export/import de presets em arquivo JSON — formato aberto versionado,
 * padrão do gradient_system. O arquivo é autossuficiente: presets carregam
 * a paleta embutida e o arquivo carrega a calibração da grade.
 */

const FORMAT = 'anna-led/1.0';

export interface ShowFile {
  format: string;
  exportedAt: string;
  presets: ShowPreset[];
  gridParams?: GridParams;
}

export function exportShowFile(presets: ShowPreset[], gridParams: GridParams): void {
  const file: ShowFile = {
    format: FORMAT,
    exportedAt: new Date().toISOString(),
    presets,
    gridParams,
  };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `anna-led-show-${stamp}.json`);
}

export function parseShowFile(text: string): ShowFile {
  const data = JSON.parse(text) as ShowFile;
  if (!data.format?.startsWith('anna-led/')) {
    throw new Error(`Formato desconhecido: ${data.format ?? 'sem campo format'}`);
  }
  if (!Array.isArray(data.presets)) {
    throw new Error('Arquivo sem lista de presets');
  }
  return data;
}

export function pickAndImportShowFile(): Promise<ShowFile> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('Nenhum arquivo selecionado'));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(parseShowFile(String(reader.result)));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
      reader.readAsText(file);
    };
    input.click();
  });
}
