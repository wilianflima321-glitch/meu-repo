import React from 'react';
import { Box, Code, FolderOpen, Gamepad2, Globe } from 'lucide-react';
import type { Project } from './ProjectsDashboard.types';

export const projectDashboardColors = {
  bg: '#0a0a0f',
  surface: '#12121a',
  surfaceHover: '#1a1a25',
  surfaceActive: '#22222f',
  border: '#2a2a3a',
  borderFocus: '#4f46e5',
  text: '#e4e4eb',
  textMuted: '#8b8b9e',
  textDim: '#5a5a6e',
  primary: '#6366f1',
  primaryHover: '#5558e3',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  accent: '#8b5cf6',
} as const;

export const projectTypeIcons: Record<Project['type'], React.ReactNode> = {
  game: <Gamepad2 size={18} />,
  web: <Globe size={18} />,
  api: <Code size={18} />,
  library: <Box size={18} />,
  other: <FolderOpen size={18} />,
};

export const projectTypeColors: Record<Project['type'], string> = {
  game: projectDashboardColors.accent,
  web: projectDashboardColors.primary,
  api: projectDashboardColors.success,
  library: projectDashboardColors.warning,
  other: projectDashboardColors.textMuted,
};

export const dashboardFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};
