'use client';

import React from 'react';
import { Play, ChevronRight } from 'lucide-react';
import { gradients, tokens } from '../../../web/lib/design-tokens';
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

interface PreviewColumnHeaderProps {
  previewPanelLabel: string;
  onClose: () => void;
}

export function PreviewColumnHeader({
  previewPanelLabel,
  onClose,
}: PreviewColumnHeaderProps) {
  return (
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
        aria-label={`Close ${previewPanelLabel.toLowerCase()}`}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
