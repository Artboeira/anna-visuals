// Syphon server — macOS only. Usa `node-syphon@1.5.0` API real
// (SyphonMetalServer / SyphonOpenGLServer).
//
// Fora do Mac, fica em modo `available=false` sem quebrar a app.
//
// node-syphon expõe IOSurface (GPU shared memory). Aqui usamos a API
// CPU bitmap (`publishImageData` com raw RGBA buffer) — caminho de menor
// código. Versão futura pode usar `publishSurfaceHandle` se conseguirmos
// uma textura GL/Metal compartilhada com o WebGL context do Electron.

class SyphonServer {
  constructor() {
    this._available = false;
    this._running = false;
    this._lastError = null;
    this._lib = null;
    this._server = null;
    this._mode = null; // 'metal' | 'opengl'

    if (process.platform !== 'darwin') {
      this._lastError = 'Syphon é macOS-only. Use OBS+NDI nesta plataforma.';
      return;
    }

    try {
      this._lib = require('node-syphon');
      this._available = true;
    } catch (err) {
      this._available = false;
      this._lastError = `node-syphon não carregou: ${err.message}. Rode "npm install node-syphon --include=optional" no Mac com Xcode tools.`;
    }
  }

  isAvailable() { return this._available; }
  isRunning()   { return this._running; }
  lastError()   { return this._lastError; }

  start(name) {
    if (!this._available) return false;
    if (this._running) return true;
    try {
      // Preferimos Metal (moderno, mais barato em Apple Silicon).
      // OpenGL fica como fallback se o GPU do Mac do Arthur não tiver Metal
      // ou se a versão de node-syphon mudar.
      if (this._lib.SyphonMetalServer) {
        this._server = new this._lib.SyphonMetalServer(name || 'ANNA_LED');
        this._mode = 'metal';
      } else if (this._lib.SyphonOpenGLServer) {
        this._server = new this._lib.SyphonOpenGLServer(name || 'ANNA_LED');
        this._mode = 'opengl';
      } else {
        throw new Error('node-syphon 1.5+: SyphonMetalServer/OpenGLServer não encontrado.');
      }
      this._running = true;
      this._lastError = null;
      return true;
    } catch (err) {
      this._lastError = `Syphon start falhou: ${err.message}`;
      this._running = false;
      return false;
    }
  }

  stop() {
    if (!this._running) return;
    try { this._server?.dispose?.(); } catch { /* noop */ }
    this._server = null;
    this._running = false;
    this._mode = null;
  }

  /**
   * Publica frame BGRA top-down vindo do Electron.
   *
   * node-syphon@1.5.0 publishImageData:
   *   - Metal:  publishImageData(data, imageRegion, textureDimension, flipped)
   *   - OpenGL: publishImageData(data, imageRegion, textureDimension, flipped, textureTarget?)
   *
   * imageRegion: {x,y,width,height}    — região da imagem dentro do server
   * textureDimension: {width,height}   — dimensão real da textura
   * flipped: bool                       — true se data está top-down (Electron sim)
   */
  publishFrame(buf, w, h) {
    if (!this._running || !this._server) return;
    try {
      // node-syphon valida o tipo: precisa ser Uint8ClampedArray, não Buffer.
      // View zero-copy sobre a mesma memória do bitmap do Electron.
      const data = new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.byteLength);
      const region = { x: 0, y: 0, width: w, height: h };
      const dim = { width: w, height: h };
      if (this._mode === 'opengl') {
        this._server.publishImageData(data, region, dim, true, 'GL_TEXTURE_RECTANGLE_EXT');
      } else {
        this._server.publishImageData(data, region, dim, true);
      }
    } catch (err) {
      this._lastError = `Syphon publish: ${err.message}`;
    }
  }
}

module.exports = { SyphonServer };
