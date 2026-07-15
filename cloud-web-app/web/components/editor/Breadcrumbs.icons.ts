import {
  Box,
  Braces,
  Code,
  Database,
  File,
  FileCode,
  FileJson,
  FileText,
  Hash,
  Image,
  Package,
  Palette,
  Parentheses,
  Shapes,
  Type,
  Variable,
  type LucideIcon,
} from 'lucide-react';
import type { SymbolKind } from './Breadcrumbs.types';

// ============================================================================
// Symbol Icons
// ============================================================================

export const SYMBOL_ICONS: Record<SymbolKind, LucideIcon> = {
  file: FileCode,
  module: Package,
  namespace: Braces,
  package: Package,
  class: Box,
  method: Parentheses,
  property: Variable,
  field: Variable,
  constructor: Parentheses,
  enum: Shapes,
  interface: Type,
  function: Parentheses,
  variable: Variable,
  constant: Hash,
  string: Code,
  number: Hash,
  boolean: Code,
  array: Braces,
  object: Braces,
  key: Variable,
  null: Code,
  enumMember: Shapes,
  struct: Box,
  event: Shapes,
  operator: Code,
  typeParameter: Type,
};

export const SYMBOL_COLORS: Record<SymbolKind, string> = {
  file: 'text-[var(--aethel-text-tertiary)]',
  module: 'text-[var(--aethel-warning-light)]',
  namespace: 'text-[var(--aethel-warning-light)]',
  package: 'text-[var(--aethel-warning-light)]',
  class: 'text-[var(--aethel-warning)]',
  method: 'text-[var(--aethel-info)]',
  property: 'text-[var(--aethel-info-light)]',
  field: 'text-[var(--aethel-info-light)]',
  constructor: 'text-[var(--aethel-info)]',
  enum: 'text-[var(--aethel-warning-light)]',
  interface: 'text-[var(--aethel-info-light)]',
  function: 'text-[var(--aethel-info)]',
  variable: 'text-[var(--aethel-secondary)]',
  constant: 'text-[var(--aethel-info)]',
  string: 'text-[var(--aethel-success)]',
  number: 'text-[var(--aethel-success)]',
  boolean: 'text-[var(--aethel-info)]',
  array: 'text-[var(--aethel-warning-light)]',
  object: 'text-[var(--aethel-warning-light)]',
  key: 'text-[var(--aethel-info-light)]',
  null: 'text-[var(--aethel-text-tertiary)]',
  enumMember: 'text-[var(--aethel-info)]',
  struct: 'text-[var(--aethel-warning)]',
  event: 'text-[var(--aethel-warning-light)]',
  operator: 'text-[var(--aethel-text-tertiary)]',
  typeParameter: 'text-[var(--aethel-success)]',
};

// ============================================================================
// File Icons by Extension
// ============================================================================

const FILE_ICONS: Record<string, LucideIcon> = {
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  json: FileJson,
  md: FileText,
  css: Palette,
  scss: Palette,
  html: Code,
  svg: Image,
  png: Image,
  jpg: Image,
  sql: Database,
};

export function getFileIcon(filename: string): LucideIcon {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || File;
}
