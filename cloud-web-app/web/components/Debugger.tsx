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
      setMessage('Verificando disponibilidade do depurador...');
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`health failed (${res.status})`);
        }
        if (!cancelled) {
          setStatus('unavailable');
          setMessage(
            'Depurador (DAP) ainda não está conectado a um backend real nesta instalação. Este painel não exibe dados simulados para manter real-or-fail.'
          );
        }
      } catch {
        if (!cancelled) {
          setStatus('unavailable');
          setMessage(
            'Depurador indisponível no momento. Verifique o backend e os endpoints DAP em /api/dap/*.'
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
          <div className="font-semibold">Recurso indisponível</div>
          <div className="mt-1">{message}</div>
          <div className="mt-3 text-xs text-[var(--aethel-text-tertiary)] dark:text-[var(--aethel-text-tertiary)]">
            Quando o backend DAP estiver implementado, este painel passará a consumir os endpoints em <span className="font-mono">/api/dap/*</span>.
          </div>
        </div>
      )}
    </div>
  );
}
