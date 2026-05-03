'use client';

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import {
  ACCENT_CYAN,
  BORDER_SECONDARY,
  SURFACE_PRIMARY,
  TEXT_SECONDARY,
} from './chromeStyles';

export function ModernIDELoading() {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    background: SURFACE_PRIMARY,
    color: TEXT_SECONDARY,
    gap: tokens.spacing['4'],
  };

  const spinnerStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    border: `3px solid ${BORDER_SECONDARY}`,
    borderTopColor: ACCENT_CYAN,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  return (
    <div style={containerStyle}>
      <div style={spinnerStyle} />
      <span style={{ fontSize: tokens.typography.fontSize.sm }}>
        Loading IDE...
      </span>
    </div>
  );
}
