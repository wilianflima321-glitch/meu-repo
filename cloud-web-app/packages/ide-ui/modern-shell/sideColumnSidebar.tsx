'use client';

import React from 'react';
import { gradients } from '../../../web/lib/design-tokens';
import { BORDER_SECONDARY } from './chromeStyles';
import { DockRegion, DockPanel } from '../docking';

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
      <DockRegion regionId="leftBar" />
      <div style={{ display: 'none' }} aria-hidden>
        {sidebar && (
          <DockPanel id="explorer" title="Explorer" defaultRegion="leftBar">
            {sidebar}
          </DockPanel>
        )}
      </div>
    </div>
  );
}
