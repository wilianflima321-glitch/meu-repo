'use client';

import React from 'react';
import { SURFACE_SECONDARY } from './chromeStyles';
import { PreviewColumnHeader } from './sideColumnChromeParts';

export interface ModernIDEShellPreviewColumnProps {
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
        minWidth: '224px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: SURFACE_SECONDARY,
        flexShrink: 0,
      }}
    >
      <PreviewColumnHeader
        previewPanelLabel={previewPanelLabel}
        onClose={onClose}
      />
      <div style={{ flex: 1, overflow: 'auto' }}>{preview}</div>
    </div>
  );
}
