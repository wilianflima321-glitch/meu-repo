#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const COMPONENTS_DIR = path.join(ROOT, 'components');
// Baseline ratchet from V17.2 after fixing the matcher to avoid counting
// TypeScript optional-property syntax (`?:`) as Portuguese copy.
// Lower this number as strings move into locale catalogs; never raise it
// without intentionally accepting new product-copy debt.
const MAX_COMPONENT_PT_COPY = 0;

const PORTUGUESE_COPY_PATTERNS = [
  /[\u00e1\u00e9\u00ed\u00f3\u00fa\u00e0\u00e2\u00ea\u00f4\u00e3\u00f5\u00e7\u00c1\u00c9\u00cd\u00d3\u00da\u00c0\u00c2\u00ca\u00d4\u00c3\u00d5\u00c7]/,
  /\b(Configura\u00e7\u00f5es|P\u00e1gina|Salvar|Cancelar|Excluir|Carregando|Falha|Erro|Projeto|Projetos|Arquivo|Arquivos)\b/i,
  /\b(Pronto|Ativo|Inativo|Suspenso|Conclu\u00eddo|Notifica\u00e7\u00f5es|Hist\u00f3rico|Altera\u00e7\u00f5es)\b/i,
];

const AUTH_ROMANIZED_PT_PATTERNS = [
  /\b(Voltar|Entrar|Senha|Esqueci|Digite|Continuar com|Proximo|Formulario|Cadastro|Cadastrar)\b/i,
  /\b(voce|nao|conta|senha|redefinicao|verificacao|instrucoes|painel|usuario|superficie|missao|estudio)\b/i,
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

function lineHasUserCopy(line, relativePath) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^\*|^\/\//.test(trimmed)) return false;
  if (/import\s|export\s+type|export\s+interface/.test(trimmed)) return false;
  return (
    PORTUGUESE_COPY_PATTERNS.some((pattern) => pattern.test(line)) ||
    (relativePath.replace(/\\/g, '/').startsWith('components/auth/') &&
      AUTH_ROMANIZED_PT_PATTERNS.some((pattern) => pattern.test(line)))
  );
}

const findings = [];

for (const filePath of walk(COMPONENTS_DIR)) {
  const relative = path.relative(ROOT, filePath);
  const source = stripComments(fs.readFileSync(filePath, 'utf8'));
  source.split(/\r?\n/).forEach((line, index) => {
    if (lineHasUserCopy(line, relative)) findings.push(`${relative}:${index + 1}: ${line.trim()}`);
  });
}

if (findings.length > MAX_COMPONENT_PT_COPY) {
  console.error(`[hardcoded-copy-ratchet] FAIL ptCopy=${findings.length} max=${MAX_COMPONENT_PT_COPY}`);
  for (const finding of findings.slice(0, 80)) console.error(`- ${finding}`);
  if (findings.length > 80) console.error(`- ... ${findings.length - 80} more`);
  process.exit(1);
}

console.log(`[hardcoded-copy-ratchet] PASS ptCopy=${findings.length} max=${MAX_COMPONENT_PT_COPY}`);
