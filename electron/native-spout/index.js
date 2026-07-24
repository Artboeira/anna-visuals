// Loader do binding Spout. Tolerante: fora do Windows, ou sem build,
// carrega como stub com `available=false` e o resto do app continua.

const path = require('path');
const fs = require('fs');

let binding = null;
let loadError = null;

if (process.platform !== 'win32') {
  loadError = 'Spout é somente Windows (no macOS use Syphon).';
} else {
  const BUILD_PATHS = [
    path.join(__dirname, 'build', 'Release', 'spout_sender.node'),
    path.join(__dirname, 'build', 'Debug', 'spout_sender.node'),
  ];
  for (const p of BUILD_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      binding = require(p);
      break;
    } catch (err) {
      loadError = `Falha ao carregar ${p}: ${err.message}`;
    }
  }
  if (!binding && !loadError) {
    loadError =
      'Binding Spout ainda não foi compilado. Clone https://github.com/leadedge/Spout2, ' +
      'defina ANNA_SPOUT_SDK e rode `npm run rebuild:spout`.';
  }
}

module.exports = {
  available: !!binding,
  error: loadError,
  SpoutSenderNative: binding ? binding.SpoutSenderNative : null,
  version: binding ? binding.version() : null,
};
