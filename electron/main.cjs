// Electron main — wrapper desktop do ANNA LED Visuals com saída NDI + Syphon.
// Copiado do gradient_system em 2026-07-20 e adaptado (nomes, output size IPC).
// Carrega o renderer (vite dev em desenvolvimento, dist/index.html em produção).
// Captura frames via webContents.beginFrameSubscription e empurra pros senders.

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { NDISender } = require('./ndi-sender.cjs');
const { SyphonServer } = require('./syphon-server.cjs');

const DEV_URL = process.env.ANNA_DEV_URL || 'http://localhost:5178';
const isDev = !app.isPackaged;
// Tape-machine: ligar saídas no boot sem clique manual quando env var presente.
//   ANNA_AUTOSTART_NDI=name        → liga NDI com esse nome de fonte
//   ANNA_AUTOSTART_SYPHON=name     → liga Syphon idem
const AUTOSTART_NDI = process.env.ANNA_AUTOSTART_NDI || '';
const AUTOSTART_SYPHON = process.env.ANNA_AUTOSTART_SYPHON || '';

let mainWindow = null;
const ndi = new NDISender();
const syphon = new SyphonServer();
let lastFrameSize = { width: 0, height: 0 };

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    backgroundColor: '#000000',
    title: 'ANNA — LED VISUALS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Frame subscription — modo VJ.
  // false (não cropped, RGBA full frame).
  let subscribed = false;
  function maybeSubscribe() {
    if (subscribed) return;
    if (!ndi.isRunning() && !syphon.isRunning()) return;
    subscribed = true;
    mainWindow.webContents.beginFrameSubscription(false, (image, dirty) => {
      const size = image.getSize();
      lastFrameSize = size;
      const bitmap = image.toBitmap(); // BGRA, top-down
      if (ndi.isRunning()) ndi.sendFrame(bitmap, size.width, size.height);
      if (syphon.isRunning()) syphon.publishFrame(bitmap, size.width, size.height);
      // dirty é um rect indicando região alterada; ignoramos por simplicidade
      void dirty;
    });
  }
  function maybeUnsubscribe() {
    if (!subscribed) return;
    if (ndi.isRunning() || syphon.isRunning()) return;
    try { mainWindow.webContents.endFrameSubscription(); } catch { /* noop */ }
    subscribed = false;
  }

  // ──────── IPC handlers ────────
  ipcMain.handle('vj:status', () => ({
    ndi: { available: ndi.isAvailable(), running: ndi.isRunning(), error: ndi.lastError() },
    syphon: { available: syphon.isAvailable(), running: syphon.isRunning(), error: syphon.lastError() },
    frame: { width: lastFrameSize.width, height: lastFrameSize.height },
    platform: process.platform,
  }));

  ipcMain.handle('vj:start-ndi', (_e, name) => {
    const ok = ndi.start(name || 'ANNA_LED');
    if (ok) maybeSubscribe();
    return { ok, error: ndi.lastError() };
  });

  ipcMain.handle('vj:stop-ndi', () => {
    ndi.stop();
    maybeUnsubscribe();
    return { ok: true };
  });

  ipcMain.handle('vj:start-syphon', (_e, name) => {
    const ok = syphon.start(name || 'ANNA_LED');
    if (ok) maybeSubscribe();
    return { ok, error: syphon.lastError() };
  });

  // Dimensiona o CONTEÚDO da janela para casar com a resolução de saída do LED.
  // Em modo apresentação o canvas preenche a janela → o frame capturado sai
  // exatamente no pixel map. Se exceder a tela, o SO clampa: nesse caso use uma
  // resolução proporcional menor (ex.: 1920×192) e escale no Resolume.
  ipcMain.handle('vj:set-output-size', (_e, width, height) => {
    if (!mainWindow || !Number.isFinite(width) || !Number.isFinite(height)) {
      return { ok: false };
    }
    try {
      mainWindow.setContentSize(Math.round(width), Math.round(height));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('vj:stop-syphon', () => {
    syphon.stop();
    maybeUnsubscribe();
    return { ok: true };
  });

  mainWindow.on('closed', () => {
    ndi.stop();
    syphon.stop();
    mainWindow = null;
  });

  // Tape-machine autostart — depois do load pra garantir webContents pronto.
  mainWindow.webContents.once('did-finish-load', () => {
    if (AUTOSTART_NDI) {
      const ok = ndi.start(AUTOSTART_NDI);
      console.log(`[autostart] NDI "${AUTOSTART_NDI}": ${ok ? 'ok' : 'fail — ' + ndi.lastError()}`);
      if (ok) maybeSubscribe();
    }
    if (AUTOSTART_SYPHON) {
      const ok = syphon.start(AUTOSTART_SYPHON);
      console.log(`[autostart] Syphon "${AUTOSTART_SYPHON}": ${ok ? 'ok' : 'fail — ' + syphon.lastError()}`);
      if (ok) maybeSubscribe();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
