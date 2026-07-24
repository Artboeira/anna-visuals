// Electron main — wrapper desktop do ANNA LED Visuals com saída NDI/Syphon/Spout.
//
// Arquitetura de duas janelas:
//   - JANELA DE CONTROLE (grande): MESA, preview, calibração — nunca capturada.
//   - JANELA DE SAÍDA (pequena, na resolução do LED, ?output=1): renderiza só
//     o canvas; é DELA que os frames são capturados para NDI/Syphon/Spout.
//     Estado sincronizado via BroadcastChannel no renderer.
//
// Por que: capturar a janela de controle (retina, ~23 MB/frame) gera um churn
// de memória de GB/s que já derrubou uma máquina em teste. A janela de saída
// em 1920×192 custa ~1,5 MB/frame — e ainda permite operar a MESA ao vivo
// enquanto o LED recebe o sinal.

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { NDISender } = require('./ndi-sender.cjs');
const { SyphonServer } = require('./syphon-server.cjs');
const { SpoutSender } = require('./spout-sender.cjs');

// GC explícito no main process: os buffers do toBitmap() são memória EXTERNA
// e o V8 quase não sente pressão dela — sem gc() explícito o processo balona.
const v8 = require('v8');
const vm = require('vm');
v8.setFlagsFromString('--expose_gc');
const forceGC = vm.runInNewContext('gc');

const DEV_URL = process.env.ANNA_DEV_URL || 'http://localhost:5178';
const isDev = !app.isPackaged;
// Tape-machine: ligar saídas no boot sem clique manual quando env var presente.
//   ANNA_AUTOSTART_NDI=name        → liga NDI com esse nome de fonte
//   ANNA_AUTOSTART_SYPHON=name     → liga Syphon idem (macOS)
//   ANNA_AUTOSTART_SPOUT=name      → liga Spout idem (Windows)
const AUTOSTART_NDI = process.env.ANNA_AUTOSTART_NDI || '';
const AUTOSTART_SYPHON = process.env.ANNA_AUTOSTART_SYPHON || '';
const AUTOSTART_SPOUT = process.env.ANNA_AUTOSTART_SPOUT || '';

// Teto de fps da captura → senders. Frame pulado = zero alocação.
// 30 fps é transparente no LED; suba com ANNA_CAPTURE_FPS=60.
const CAPTURE_FPS = Math.max(5, Math.min(60, parseInt(process.env.ANNA_CAPTURE_FPS || '30', 10) || 30));
const CAPTURE_MIN_INTERVAL_MS = 1000 / CAPTURE_FPS - 1;

let mainWindow = null;
let outputWindow = null;
let outputSize = { width: 1920, height: 192 }; // último tamanho pedido pela UI
const ndi = new NDISender();
const syphon = new SyphonServer();
const spout = new SpoutSender();
let lastFrameSize = { width: 0, height: 0 };

// ──────── captura (sempre da JANELA DE SAÍDA) ────────

let subscribed = false;
let shared = null; // buffer único reutilizável para os senders
let gcTimer = null;

function anySenderRunning() {
  return ndi.isRunning() || syphon.isRunning() || spout.isRunning();
}

function maybeSubscribe() {
  if (subscribed) return;
  if (!anySenderRunning()) return;
  ensureOutputWindow();
  if (!outputWindow) return;
  subscribed = true;

  let gcTicks = 0;
  gcTimer = setInterval(() => {
    try { forceGC(); } catch { /* noop */ }
    if (++gcTicks % 20 === 0) {
      const rss = process.memoryUsage().rss / (1024 * 1024);
      console.log(`[mem] rss ${rss.toFixed(0)} MB (captura ativa ${lastFrameSize.width}x${lastFrameSize.height}@${CAPTURE_FPS})`);
    }
  }, 500);

  let lastSentAt = 0;
  outputWindow.webContents.beginFrameSubscription(false, (image, dirty) => {
    // Estrangula ANTES do toBitmap: frame pulado = zero alocação
    const nowMs = Date.now();
    if (nowMs - lastSentAt < CAPTURE_MIN_INTERVAL_MS) return;
    lastSentAt = nowMs;

    const size = image.getSize();
    lastFrameSize = size;
    const bitmap = image.toBitmap(); // BGRA, top-down (nova alocação por frame)
    if (!shared || shared.length !== bitmap.length) {
      shared = Buffer.allocUnsafe(bitmap.length);
    }
    bitmap.copy(shared);
    if (ndi.isRunning()) ndi.sendFrame(shared, size.width, size.height);
    if (syphon.isRunning()) syphon.publishFrame(shared, size.width, size.height);
    if (spout.isRunning()) spout.sendFrame(shared, size.width, size.height);
    void dirty;
  });
}

function unsubscribe() {
  if (!subscribed) return;
  try { outputWindow?.webContents.endFrameSubscription(); } catch { /* noop */ }
  subscribed = false;
  if (gcTimer) { clearInterval(gcTimer); gcTimer = null; }
  shared = null;
  try { forceGC(); } catch { /* noop */ }
}

function maybeUnsubscribe() {
  if (anySenderRunning()) return;
  unsubscribe();
}

// ──────── janelas ────────

function ensureOutputWindow() {
  if (outputWindow) return;
  outputWindow = new BrowserWindow({
    width: outputSize.width,
    height: outputSize.height,
    useContentSize: true,
    backgroundColor: '#000000',
    title: `ANNA — SAÍDA ${outputSize.width}×${outputSize.height}`,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    outputWindow.loadURL(`${DEV_URL}/?output=1`);
  } else {
    outputWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      query: { output: '1' },
    });
  }

  outputWindow.on('closed', () => {
    unsubscribe();
    outputWindow = null;
  });
}

function setOutputWindowSize(width, height) {
  outputSize = { width: Math.round(width), height: Math.round(height) };
  ensureOutputWindow();
  if (!outputWindow) return false;
  try {
    outputWindow.setContentSize(outputSize.width, outputSize.height);
    outputWindow.setTitle(`ANNA — SAÍDA ${outputSize.width}×${outputSize.height}`);
    return true;
  } catch {
    return false;
  }
}

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

  mainWindow.on('closed', () => {
    ndi.stop();
    syphon.stop();
    spout.stop();
    unsubscribe();
    if (outputWindow) {
      try { outputWindow.close(); } catch { /* noop */ }
    }
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
    if (AUTOSTART_SPOUT) {
      const ok = spout.start(AUTOSTART_SPOUT);
      console.log(`[autostart] Spout "${AUTOSTART_SPOUT}": ${ok ? 'ok' : 'fail — ' + spout.lastError()}`);
      if (ok) maybeSubscribe();
    }
  });
}

// ──────── IPC ────────

ipcMain.handle('vj:status', () => ({
  ndi: { available: ndi.isAvailable(), running: ndi.isRunning(), error: ndi.lastError() },
  syphon: { available: syphon.isAvailable(), running: syphon.isRunning(), error: syphon.lastError() },
  spout: { available: spout.isAvailable(), running: spout.isRunning(), error: spout.lastError() },
  frame: { width: lastFrameSize.width, height: lastFrameSize.height },
  outputWindowOpen: !!outputWindow,
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

ipcMain.handle('vj:stop-syphon', () => {
  syphon.stop();
  maybeUnsubscribe();
  return { ok: true };
});

ipcMain.handle('vj:start-spout', (_e, name) => {
  const ok = spout.start(name || 'ANNA_LED');
  if (ok) maybeSubscribe();
  return { ok, error: spout.lastError() };
});

ipcMain.handle('vj:stop-spout', () => {
  spout.stop();
  maybeUnsubscribe();
  return { ok: true };
});

// Abre/dimensiona a JANELA DE SAÍDA no tamanho exato do pixel map.
// Se exceder a tela, o SO clampa: use uma resolução proporcional menor
// (ex.: 1920×192) e escale no Resolume.
ipcMain.handle('vj:set-output-size', (_e, width, height) => {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return { ok: false };
  return { ok: setOutputWindowSize(width, height) };
});

ipcMain.handle('vj:open-output', () => {
  ensureOutputWindow();
  return { ok: !!outputWindow };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
