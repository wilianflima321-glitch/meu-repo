'use client';

import { useEffect, useState } from 'react';

import { AdminCompliancePanel } from '../compliance/AdminCompliancePanel';
import { AdminModerationPanel } from '../moderation/AdminModerationPanel';

export function AdminSecurityLegacyDrawers() {
  const [showCompliancePanel, setShowCompliancePanel] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);

  useEffect(() => {
    const legacy = new URLSearchParams(window.location.search).get('legacy');
    if (legacy === 'compliance') setShowCompliancePanel(true);
    if (legacy === 'moderation') setShowModerationPanel(true);
  }, []);

  return (
    <>
      <details
        id="compliance"
        className="mb-6 rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-4"
        open={showCompliancePanel}
        onToggle={(event) => setShowCompliancePanel(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm font-semibold text-[var(--aethel-text-primary)]">
          Compliance posture
        </summary>
        <div className="mt-4">
          <AdminCompliancePanel />
        </div>
      </details>

      <details
        id="moderation"
        className="mb-6 rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-4"
        open={showModerationPanel}
        onToggle={(event) => setShowModerationPanel(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm font-semibold text-[var(--aethel-text-primary)]">
          Moderation queue
        </summary>
        <div className="mt-4">
          <AdminModerationPanel />
        </div>
      </details>
    </>
  );
}

export default AdminSecurityLegacyDrawers;
