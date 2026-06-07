'use client';

import { useEffect, useState } from 'react';

import { AdminCollaborationPanel } from '../collaboration/AdminCollaborationPanel';
import { AdminIdeSettingsPanel } from '../ide-settings/AdminIdeSettingsPanel';

export function AdminProductLegacyDrawers() {
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(false);
  const [showIdeSettingsPanel, setShowIdeSettingsPanel] = useState(false);

  useEffect(() => {
    const legacy = new URLSearchParams(window.location.search).get('legacy');
    if (legacy === 'collaboration') setShowCollaborationPanel(true);
    if (legacy === 'ide-settings') setShowIdeSettingsPanel(true);
  }, []);

  return (
    <>
      <details
        id="collaboration"
        className="mb-6 rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-4"
        open={showCollaborationPanel}
        onToggle={(event) => setShowCollaborationPanel(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm font-semibold text-[var(--aethel-text-primary)]">
          Collaboration readiness
        </summary>
        <div className="mt-4">
          <AdminCollaborationPanel />
        </div>
      </details>

      <details
        id="ide-settings"
        className="mb-6 rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-4"
        open={showIdeSettingsPanel}
        onToggle={(event) => setShowIdeSettingsPanel(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm font-semibold text-[var(--aethel-text-primary)]">
          IDE settings
        </summary>
        <div className="mt-4">
          <AdminIdeSettingsPanel />
        </div>
      </details>
    </>
  );
}

export default AdminProductLegacyDrawers;
