/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

function ensurePrismaClientLink() {
  const root = process.cwd();
  const target = path.join(root, 'node_modules', '.prisma');
  const linkPath = path.join(root, 'node_modules', '@prisma', 'client', '.prisma');

  if (!fs.existsSync(target)) {
    console.warn('[fix-prisma-client] node_modules/.prisma não existe; rode `prisma generate` primeiro.');
    return;
  }

  if (fs.existsSync(linkPath)) {
    return;
  }

  fs.mkdirSync(path.dirname(linkPath), { recursive: true });

  try {
    const type = process.platform === 'win32' ? 'junction' : 'dir';
    fs.symlinkSync(target, linkPath, type);
    console.log('[fix-prisma-client] Criado link:', linkPath, '->', target);
    return;
  } catch (e) {
    console.warn('[fix-prisma-client] Falhou symlink/junction, fallback para cópia. Motivo:', e && e.message ? e.message : e);
  }

  // Fallback: copia o diretório (Node >= 16.7)
  try {
    fs.cpSync(target, linkPath, { recursive: true });
    console.log('[fix-prisma-client] Copiado:', target, '->', linkPath);
  } catch (e) {
    console.error('[fix-prisma-client] Falhou copiar .prisma. Motivo:', e && e.message ? e.message : e);
    process.exitCode = 1;
  }
}

ensurePrismaClientLink();
