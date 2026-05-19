import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  Archive,
  Box,
  Code,
  CreditCard,
  FolderOpen,
  Gamepad2,
  Globe,
  Settings,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import type { Project } from './ProjectsDashboard.types';

export const colors = {
  bg: 'var(--aethel-surface-primary)',
  surface: 'var(--aethel-surface-secondary)',
  surfaceHover: 'var(--aethel-surface-tertiary)',
  surfaceActive: 'var(--aethel-surface-quaternary)',
  border: 'var(--aethel-border-primary)',
  borderFocus: 'var(--aethel-border-focus)',
  text: 'var(--aethel-text-primary)',
  textMuted: 'var(--aethel-text-tertiary)',
  textDim: 'var(--aethel-text-quaternary)',
  primary: 'var(--aethel-primary)',
  primaryHover: 'var(--aethel-primary-dark)',
  success: 'var(--aethel-success)',
  warning: 'var(--aethel-warning)',
  error: 'var(--aethel-error)',
  accent: 'var(--aethel-accent)',
} as const;

export const tint = (color: string, percent: number) =>
  `color-mix(in_srgb, ${color} ${percent}%, transparent)`;

const projectTypeIcons: Record<Project['type'], LucideIcon> = {
  game: Gamepad2,
  web: Globe,
  api: Code,
  library: Box,
  other: FolderOpen,
};

export const typeColors: Record<Project['type'], string> = {
  game: colors.accent,
  web: colors.primary,
  api: colors.success,
  library: colors.warning,
  other: colors.textMuted,
};

export function renderProjectTypeIcon(type: Project['type'], size = 18): React.ReactNode {
  const Icon = projectTypeIcons[type];
  return <Icon size={size} />;
}

export const projectTypeOptions: Array<{ value: Project['type']; label: string }> = [
  { value: 'game', label: 'Games' },
  { value: 'web', label: 'Web' },
  { value: 'api', label: 'API' },
  { value: 'library', label: 'Library' },
  { value: 'other', label: 'Outros' },
];

export const quickActions = [
  { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  { href: '/billing', label: 'Faturamento', icon: <CreditCard size={20} /> },
  { href: '/team', label: 'Team', icon: <Users size={20} /> },
  { href: '/help', label: 'Suporte', icon: <AlertCircle size={20} /> },
] as const;

export const dashboardStatDefinitions: ReadonlyArray<{
  key: 'totalProjects' | 'activeProjects' | 'totalStorage' | 'aiTokensUsed';
  label: string;
  icon: React.ReactNode;
  color?: string;
}> = [
  { key: 'totalProjects', label: 'Total projects', icon: <FolderOpen size={20} /> },
  { key: 'activeProjects', label: 'Active projects', icon: <Zap size={20} />, color: colors.success },
  { key: 'totalStorage', label: 'Storage Usado', icon: <Archive size={20} />, color: colors.accent },
  { key: 'aiTokensUsed', label: 'Tokens AI Usados', icon: <Sparkles size={20} />, color: colors.warning },
] as const;

export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export function formatRelativeProjectTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d atras`;
  if (hours > 0) return `${hours}h atras`;
  return 'Now';
}

export function formatProjectTypeLabel(type: Project['type']): string {
  return projectTypeOptions.find((option) => option.value === type)?.label ?? type;
}
