'use client';

import React, { useEffect, useState } from 'react';

type DebuggerStatus = 'idle' | 'checking' | 'unavailable' | 'available';

export default function Debugger() {
  const [status, setStatus] = useState<DebuggerStatus>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setStatus('checking');
      setMessage('Checking disponibilidade do depurador...');
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`health failed (${res.status})`);
        }
        if (!cancelled) {
          setStatus('unavailable');
          setMessage(
            'Debugger (DAP) is not connected to a real backend in this installation. This panel does not show simulated data to keep real-or-fail behavior.'
          );
        }
      } catch {
        if (!cancelled) {
          setStatus('unavailable');
          setMessage(
            'Depurador inavailable no momento. Verifique o backend e os endpoints DAP em /api/dap/*.'
          );
        }
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="debugger p-4 bg-[var(--aethel-surface-secondary)] dark:bg-[var(--aethel-surface-secondary)]">
      <h3 className="font-bold mb-2">Debugger</h3>

      {status === 'checking' ? (
        <div className="text-sm text-[var(--aethel-text-quaternary)] dark:text-[var(--aethel-text-secondary)]">{message}</div>
      ) : (
        <div className="text-sm text-[var(--aethel-text-quaternary)] dark:text-[var(--aethel-text-primary)]">
          <div className="font-semibold">Recurso inavailable</div>
          <div className="mt-1">{message}</div>
          <div className="mt-3 text-xs text-[var(--aethel-text-tertiary)] dark:text-[var(--aethel-text-tertiary)]">
            When the DAP backend is implemented, this panel will consume the endpoints at <span className="font-mono">/api/dap/*</span>.
          </div>
        </div>
      )}
    </div>
  );
}
