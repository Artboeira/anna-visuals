// Electron main — wrapper desktop do ANNA LED Visuals com saída NDI + Syphon.
// Copiado do gradient_system em 2026-07-20 e adaptado (nomes, output size IPC).
// Carrega o renderer (vite dev em desenvolvimento, dist/index.html em produção).
// Captura frames via webContents.beginFrameSubscription e empurra pros senders.

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { NDISender } = require('./ndi-sender.cjs');
const { SyphonServer } = require('./syphon-server.cjs');
const { SpoutSender } = require('./spout-sender.cjs');

// GC explícito no main process: os buffers do toBitmap() são memória EXTERNA
// (em 6200×512 @ 60fps são ~760 MB/s) e o V8 quase não sente pressão dela —
// sem gc() explícito o processo balona até dezenas de GB em segundos.
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

// Teto de fps da captura → senders. Cada toBitmap() aloca w*h*4 bytes (em
// janela retina de edição, ~23 MB/frame): pular frames aqui é o que segura
// a memória. 30 fps é transparente no LED; suba com ANNA_CAPTURE_FPS=60.
const CAPTURE_FPS = Math.max(5, Math.min(60, parseInt(process.env.ANNA_CAPTURE_FPS || '30', 10) || 30));
const CAPTURE_MIN_INTERVAL_MS = 1000 / CAPTURE_FPS - 1;

let mainWindow = null;
const ndi = new NDISender();
const syphon = new SyphonServer();
const spout = new SpoutSender();
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
  // Buffer reutilizável: os senders recebem SEMPRE a mesma alocação — se um
  // deles (node-syphon, por ex.) retiver a referência entre frames, retém um
  // único buffer em vez de pinar cada bitmap de 12+ MB por frame.
  let shared = null;
  // GC periódico enquanto a captura roda: libera os bitmaps externos que o
  // V8 deixaria acumular (causa do estouro de memória visto em teste).
  let gcTimer = null;

  function maybeSubscribe() {
    if (subscribed) return;
    if (!ndi.isRunning() && !syphon.isRunning() && !spout.isRunning()) return;
    subscribed = true;
    let gcTicks = 0;
    gcTimer = setInterval(() => {
      try { forceGC(); } catch { /* noop */ }
      if (++gcTicks % 20 === 0) {
        const rss = process.memoryUsage().rss / (1024 * 1024);
        console.log(`[mem] rss ${rss.toFixed(0)} MB (captura ativa)`);
      }
    }, 500);
    let lastSentAt = 0;
    mainWindow.webContents.beginFrameSubscription(false, (image, dirty) => {
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
      // dirty é um rect indicando região alterada; ignoramos por simplicidade
      void dirty;
    });
  }
  function maybeUnsubscribe() {
    if (!subscribed) return;
    if (ndi.isRunning() || syphon.isRunning() || spout.isRunning()) return;
    try { mainWindow.webContents.endFrameSubscription(); } catch { /* noop */ }
    subscribed = false;
    if (gcTimer) { clearInterval(gcTimer); gcTimer = null; }
    shared = null;
    try { forceGC(); } catch { /* noop */ }
  }

  // ──────── IPC handlers ────────
  ipcMain.handle('vj:status', () => ({
    ndi: { available: ndi.isAvailable(), running: ndi.isRunning(), error: ndi.lastError() },
    syphon: { available: syphon.isAvailable(), running: syphon.isRunning(), error: syphon.lastError() },
    spout: { available: spout.isAvailable(), running: spout.isRunning(), error: spout.lastError() },
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

  mainWindow.on('closed', () => {
    ndi.stop();
    syphon.stop();
    spout.stop();
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

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
