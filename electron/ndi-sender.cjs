// NDI sender — wrapper em volta do binding N-API custom em electron/native.
//
// O caminho:
//   electron/native/ndi_sender.cc → C++ N-API → libndi nativa
//
// Para o binding compilar é preciso ter o NDI SDK instalado no host:
//   macOS: NDI Advanced SDK em /Library/NDI Advanced SDK for Apple
//   Linux: libndi.so + headers (default ~/.local/{lib,include/ndi})
//   Win:   NDI SDK em %ANNA_NDI_SDK%
// Detalhes em VJ_INTEGRATION.md.
//
// Se o build falhar (SDK ausente, toolchain incompleta), este wrapper
// volta pro modo "available=false" e a UI mostra a mensagem do erro.

const path = require('path');
const fs = require('fs');

class NDISender {
  constructor() {
    this._available = false;
    this._running = false;
    this._lastError = null;
    this._native = null;
    this._sender = null;

    const nativePath = path.join(__dirname, 'native', 'index.js');
    if (!fs.existsSync(nativePath)) {
      this._lastError = 'Binding nativo não encontrado em electron/native/index.js.';
      return;
    }
    try {
      this._native = require(nativePath);
      if (!this._native.available) {
        this._lastError = this._native.error ??
          'Binding NDI nativo não compilou. Rode `npm run rebuild:ndi` após instalar o NDI SDK.';
        return;
      }
      this._available = true;
    } catch (err) {
      this._lastError = `NDI binding falhou: ${err.message}`;
    }
  }

  isAvailable() { return this._available; }
  isRunning()   { return this._running; }
  lastError()   { return this._lastError; }
  version()     { return this._native ? this._native.version : null; }

  start(name) {
    if (!this._available) return false;
    if (this._running) return true;
    try {
      this._sender = new this._native.NDISenderNative(name || 'ANNA_LED');
      this._running = true;
      this._lastError = null;
      return true;
    } catch (err) {
      this._lastError = `NDI start falhou: ${err.message}`;
      this._running = false;
      return false;
    }
  }

  stop() {
    if (!this._running) return;
    try { this._sender?.destroy?.(); } catch { /* noop */ }
    this._sender = null;
    this._running = false;
  }

  /**
   * Envia frame BGRA top-down (Electron toBitmap formato default).
   * @param {Buffer} buf
   * @param {number} w
   * @param {number} h
   */
  sendFrame(buf, w, h) {
    if (!this._running || !this._sender) return;
    try {
      this._sender.sendFrame(buf, w, h, w * 4);
    } catch (err) {
      this._lastError = `NDI sendFrame: ${err.message}`;
      // Não pára: VJ continua, próximo frame tenta de novo.
    }
  }
}

module.exports = { NDISender };
