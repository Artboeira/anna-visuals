// Spout sender — wrapper em volta do binding N-API em electron/native-spout.
// Espelha o padrão do ndi-sender.cjs. Spout é o "Syphon do Windows":
// compartilhamento de textura local via DirectX; o Resolume recebe nativo.
//
// Para compilar o binding (na máquina Windows):
//   git clone https://github.com/leadedge/Spout2 C:\Spout2
//   set ANNA_SPOUT_SDK=C:/Spout2/SPOUTSDK
//   npm run rebuild:spout
//
// Fora do Windows, ou sem build, o wrapper reporta available=false e a UI
// mostra o motivo — nada quebra.

const path = require('path');
const fs = require('fs');

class SpoutSender {
  constructor() {
    this._available = false;
    this._running = false;
    this._lastError = null;
    this._native = null;
    this._sender = null;

    if (process.platform !== 'win32') {
      this._lastError = 'Spout é somente Windows (no macOS use Syphon).';
      return;
    }

    const nativePath = path.join(__dirname, 'native-spout', 'index.js');
    if (!fs.existsSync(nativePath)) {
      this._lastError = 'Binding nativo não encontrado em electron/native-spout/index.js.';
      return;
    }
    try {
      this._native = require(nativePath);
      if (!this._native.available) {
        this._lastError =
          this._native.error ?? 'Binding Spout não compilou. Rode `npm run rebuild:spout`.';
        return;
      }
      this._available = true;
    } catch (err) {
      this._lastError = `Spout binding falhou: ${err.message}`;
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
      this._sender = new this._native.SpoutSenderNative(name || 'ANNA_LED');
      this._running = true;
      this._lastError = null;
      return true;
    } catch (err) {
      this._lastError = `Spout start falhou: ${err.message}`;
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
      this._lastError = `Spout sendFrame: ${err.message}`;
      // Não pára: próximo frame tenta de novo.
    }
  }
}

module.exports = { SpoutSender };
