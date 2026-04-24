'use client';

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import {
  ActiveFileStatus,
  STATUS_BAR_LEADING_ITEMS,
  STATUS_BAR_TRAILING_ITEMS,
  StatusMetric,
} from './chromeDockParts';
import { BORDER_SECONDARY, SURFACE_SECONDARY, TEXT_SECONDARY } from './chromeStyles';

const statusMetricGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing['4'],
};

export interface StatusBarProps {
  activeFileName?: string;
}

export function StatusBar({ activeFileName }: StatusBarProps) {
  const statusBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacing['1.5']} ${tokens.spacing['4']}`,
    background: SURFACE_SECONDARY,
    borderTop: `1px solid ${BORDER_SECONDARY}`,
    minHeight: '28px',
    fontSize: tokens.typography.fontSize.xs,
    color: TEXT_SECONDARY,
    gap: tokens.spacing['4'],
  };

  return (
    <div style={statusBarStyle}>
      <div style={{ ...statusMetricGroupStyle, minWidth: 0 }}>
        {STATUS_BAR_LEADING_ITEMS.map((item, index) => (
          <StatusMetric key={`${item.label}-${index}`} icon={item.icon} label={item.label} />
        ))}
      </div>

      {activeFileName ? <ActiveFileStatus activeFileName={activeFileName} /> : null}

      <div style={{ ...statusMetricGroupStyle, flexShrink: 0 }}>
        {STATUS_BAR_TRAILING_ITEMS.map((item, index) => (
          <StatusMetric key={`${item.label}-${index}`} icon={item.icon} label={item.label} />
        ))}
      </div>
    </div>
  );
}
