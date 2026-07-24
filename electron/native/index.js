// Loader do binding nativo. Tolerante a build ausente: se .node não existir
// (ex: usuário não instalou NDI SDK), módulo carrega como stub com
// `available=false` e o resto do app continua.

const path = require('path');
const fs = require('fs');

const BUILD_PATHS = [
  path.join(__dirname, 'build', 'Release', 'ndi_sender.node'),
  path.join(__dirname, 'build', 'Debug',   'ndi_sender.node'),
];

let binding = null;
let loadError = null;

for (const p of BUILD_PATHS) {
  if (!fs.existsSync(p)) continue;
  try {
    binding = require(p);
    if (binding && typeof binding.initialize === 'function') {
      const ok = binding.initialize();
      if (!ok) {
        loadError = 'NDIlib_initialize() retornou false. Runtime NDI ausente ou incompatível.';
        binding = null;
      }
    }
    break;
  } catch (err) {
    loadError = `Falha ao carregar ${p}: ${err.message}`;
  }
}

if (!binding && !loadError) {
  loadError = 'Binding nativo ainda não foi compilado. Rode `npm run rebuild:ndi`.';
}

module.exports = {
  available: !!binding,
  error: loadError,
  NDISenderNative: binding ? binding.NDISenderNative : null,
  version: binding ? binding.version() : null,
  destroy: () => { if (binding) binding.destroy(); },
};
