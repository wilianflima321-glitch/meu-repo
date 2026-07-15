'use client';

import React from 'react';
import { ChevronLeft, Play } from 'lucide-react';
import { gradients, tokens } from '../../../web/lib/design-tokens';
import { BORDER_SECONDARY, TEXT_SECONDARY } from './chromeStyles';

export interface ModernIDEShellPreviewRevealProps {
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
      aria-label={`Open ${previewPanelLabel.toLowerCase()}`}
    >
      <ChevronLeft size={16} />
      <Play size={14} />
      {previewPanelLabel}
    </button>
  );
}
