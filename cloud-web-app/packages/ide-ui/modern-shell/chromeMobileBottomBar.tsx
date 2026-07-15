'use client';

import React from 'react';
import { gradients, tokens } from '../../../web/lib/design-tokens';
import { MOBILE_BOTTOM_BAR_ITEMS, MobileBottomBarItemButton } from './chromeDockParts';
import { BORDER_SECONDARY } from './chromeStyles';
import type { PanelState } from './types';

export interface MobileBottomBarProps {
  panelState: PanelState;
  onTogglePanel: (panel: keyof PanelState) => void;
}

export function MobileBottomBar({
  panelState,
  onTogglePanel,
}: MobileBottomBarProps) {
  const barStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: `${tokens.spacing['2']} ${tokens.spacing['2']}`,
    background: gradients.glassStrong,
    borderTop: `1px solid ${BORDER_SECONDARY}`,
    minHeight: '60px',
    gap: tokens.spacing['1'],
  };

  return (
    <nav style={barStyle} aria-label="Mobile IDE controls">
      {MOBILE_BOTTOM_BAR_ITEMS.map((item) => (
        <MobileBottomBarItemButton
          key={item.id}
          item={item}
          active={panelState[item.id].open}
          onClick={() => onTogglePanel(item.id)}
        />
      ))}
    </nav>
  );
}
