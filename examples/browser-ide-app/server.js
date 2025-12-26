const path = require('path');

// Carrega variáveis de ambiente do repo (se existir)
try {
  const dotenv = require('dotenv');
  const rootEnv = path.resolve(__dirname, '..', '..', '.env');
  dotenv.config({ path: rootEnv });
} catch {
  // ignore
}

// Executa o backend real TypeScript (sem mocks)
require('ts-node/register/transpile-only');
require('./server.ts');
