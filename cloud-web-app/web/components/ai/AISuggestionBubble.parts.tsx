'use client';

// @aethel-heavy-async-boundary: imported only through lazy AI surfaces.

import { useCallback, useState } from 'react';
import { motion } from '@/lib/ui/motion';
import { Check, Copy } from 'lucide-react';

// SUB-COMPONENTS
// ============================================================================

export function AIPulse({ className }: { className: string }) {
  return (
    <motion.div
      className={`absolute inset-0 rounded-full ${className}`}
      animate={{
        scale: [1, 1.5, 1],
        opacity: [0.3, 0, 0.3],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

export function CodePreview({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="relative mt-2 rounded bg-[var(--aethel-surface-primary)] border border-[var(--aethel-border-primary)] overflow-hidden">
      <pre className="p-2 text-xs text-[var(--aethel-text-secondary)] overflow-x-auto max-h-[100px]">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-1 right-1 p-1 bg-[var(--aethel-surface-secondary)] hover:bg-[var(--aethel-surface-tertiary)] rounded transition-colors"
        aria-label={copied ? 'Copiado' : 'Copiar codigo'}
      >
        {copied ? (
          <Check className="w-3 h-3 text-[var(--aethel-success)]" />
        ) : (
          <Copy className="w-3 h-3 text-[var(--aethel-text-tertiary)]" />
        )}
      </button>
    </div>
  );
}

// ============================================================================
