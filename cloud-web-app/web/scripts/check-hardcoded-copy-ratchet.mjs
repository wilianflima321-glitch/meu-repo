#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const COMPONENTS_DIR = path.join(ROOT, 'components');
// Baseline ratchet from V16.1. Lower this number as strings move into locale
// catalogs; never raise it without intentionally accepting new product-copy debt.
const MAX_COMPONENT_PT_COPY = 801;

const PORTUGUESE_COPY_PATTERNS = [
  /[áéíóúàâêôãõçÁÉÍÓÚÀÂÊÔÃÕÇ]/,
  /\b(Configurações|Página|Salvar|Cancelar|Excluir|Carregando|Falha|Erro|Projeto|Projetos|Arquivo|Arquivos)\b/i,
  /\b(Pronto|Ativo|Inativo|Suspenso|Concluído|Notificações|Histórico|Alterações)\b/i,
];

const ALLOWED_PATH_PARTS = [
  `${path.sep}__tests__${path.sep}`,
  `${path.sep}stories${path.sep}`,
  '.stories.',
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!/\.(tsx|ts)$/.test(entry.name)) return [];
    if (ALLOWED_PATH_PARTS.some((part) => fullPath.includes(part))) return [];
    return [fullPath];
  });
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+\/\/.*$/gm, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function lineHasUserCopy(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^\*|^\/\//.test(trimmed)) return false;
  if (/import\s|export\s+type|export\s+interface/.test(trimmed)) return false;
  return PORTUGUESE_COPY_PATTERNS.some((pattern) => pattern.test(line));
}

const findings = [];

for (const filePath of walk(COMPONENTS_DIR)) {
  const relative = path.relative(ROOT, filePath);
  const source = stripComments(fs.readFileSync(filePath, 'utf8'));
  source.split(/\r?\n/).forEach((line, index) => {
    if (lineHasUserCopy(line)) findings.push(`${relative}:${index + 1}: ${line.trim()}`);
  });
}

if (findings.length > MAX_COMPONENT_PT_COPY) {
  console.error(`[hardcoded-copy-ratchet] FAIL ptCopy=${findings.length} max=${MAX_COMPONENT_PT_COPY}`);
  for (const finding of findings.slice(0, 80)) console.error(`- ${finding}`);
  if (findings.length > 80) console.error(`- ... ${findings.length - 80} more`);
  process.exit(1);
}

console.log(`[hardcoded-copy-ratchet] PASS ptCopy=${findings.length} max=${MAX_COMPONENT_PT_COPY}`);
