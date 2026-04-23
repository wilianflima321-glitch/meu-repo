import React from 'react';

const ICON_BUTTON_CLASS =
  'rounded text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]';

export interface TerminalIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  compact?: boolean;
  label: string;
}

export function TerminalIconButton({
  children,
  className = '',
  compact = false,
  label,
  type = 'button',
  ...props
}: TerminalIconButtonProps) {
  return (
    <button
      type={type}
      className={`${compact ? 'p-1' : 'p-1.5'} ${ICON_BUTTON_CLASS} ${className}`.trim()}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
}
