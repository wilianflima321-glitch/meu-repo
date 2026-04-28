'use client';

import React from 'react';
import { gradients } from '@/lib/design-tokens';
import { BORDER_SECONDARY } from './chromeStyles';

export interface ModernIDEShellSidebarColumnProps {
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
        minWidth: '184px',
        maxWidth: '360px',
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
