// Preload — ponte segura entre renderer (web) e main process.
// Expõe window.electronVJ com API mínima.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronVJ', {
  /** @returns {Promise<{ndi:{available:boolean,running:boolean,error:string|null}, syphon:{...}, frame:{width:number,height:number}, platform:string}>} */
  status: () => ipcRenderer.invoke('vj:status'),
  startNDI: (name) => ipcRenderer.invoke('vj:start-ndi', name),
  stopNDI: () => ipcRenderer.invoke('vj:stop-ndi'),
  startSyphon: (name) => ipcRenderer.invoke('vj:start-syphon', name),
  stopSyphon: () => ipcRenderer.invoke('vj:stop-syphon'),
  startSpout: (name) => ipcRenderer.invoke('vj:start-spout', name),
  stopSpout: () => ipcRenderer.invoke('vj:stop-spout'),
  setOutputSize: (width, height) => ipcRenderer.invoke('vj:set-output-size', width, height),
});
