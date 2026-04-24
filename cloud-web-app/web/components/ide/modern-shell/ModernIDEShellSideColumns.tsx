'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { tokens, gradients } from '@/lib/design-tokens';
import {
  BORDER_SECONDARY,
  SURFACE_SECONDARY,
  TEXT_SECONDARY,
  chromeBarHeight,
  chromeBarPadding,
  iconButtonStyle,
} from './chromeStyles';

export function PanelTitle({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span
      style={{
        fontSize: tokens.typography.fontSize.xs,
        fontWeight: tokens.typography.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: TEXT_SECONDARY,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing['2'],
      }}
    >
      {icon}
      {label}
    </span>
  );
}

interface ModernIDEShellSidebarColumnProps {
  sidebar: React.ReactNode;
  size: number;
}

export function ModernIDEShellSidebarColumn({
  sidebar,
  size,
}: ModernIDEShellSidebarColumnProps) {
  return (
    <div
      style={{
        width: `${size}%`,
        minWidth: '200px',
        maxWidth: '400px',
        background: gradients.glassSubtle,
        borderRight: `1px solid ${BORDER_SECONDARY}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {sidebar}
    </div>
  );
}

interface ModernIDEShellPreviewColumnProps {
  preview: React.ReactNode;
  size: number;
  previewPanelLabel: string;
  onClose: () => void;
}

export function ModernIDEShellPreviewColumn({
  preview,
  size,
  previewPanelLabel,
  onClose,
}: ModernIDEShellPreviewColumnProps) {
  return (
    <div
      style={{
        width: `${size}%`,
        minWidth: '250px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: SURFACE_SECONDARY,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: chromeBarPadding,
          minHeight: chromeBarHeight,
          borderBottom: `1px solid ${BORDER_SECONDARY}`,
          background: gradients.glassSubtle,
        }}
      >
        <PanelTitle icon={<Play size={14} />} label={previewPanelLabel} />
        <button
          type="button"
          onClick={onClose}
          style={iconButtonStyle}
          aria-label={`Fechar ${previewPanelLabel.toLowerCase()}`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>{preview}</div>
    </div>
  );
}

interface ModernIDEShellPreviewRevealProps {
  previewPanelLabel: string;
  onOpen: () => void;
}

export function ModernIDEShellPreviewReveal({
  previewPanelLabel,
  onOpen,
}: ModernIDEShellPreviewRevealProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        position: 'absolute',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        padding: `${tokens.spacing['2']} ${tokens.spacing['1.5']}`,
        background: gradients.glassMedium,
        border: `1px solid ${BORDER_SECONDARY}`,
        borderRight: 'none',
        borderRadius: `${tokens.radius.lg} 0 0 ${tokens.radius.lg}`,
        color: TEXT_SECONDARY,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing['2'],
        zIndex: 10,
      }}
      aria-label={`Abrir ${previewPanelLabel.toLowerCase()}`}
    >
      <ChevronLeft size={16} />
      <Play size={14} />
      {previewPanelLabel}
    </button>
  );
}
