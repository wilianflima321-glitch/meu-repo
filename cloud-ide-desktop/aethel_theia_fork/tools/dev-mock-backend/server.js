const path = require('path');

// Wrapper para manter compatibilidade com scripts/docs.
// Roda o mock backend real que mora na raiz do aethel_theia_fork.
const rootServer = path.resolve(__dirname, '..', '..', 'server.js');

// Exponha PORT opcionalmente via env var.
require(rootServer);
