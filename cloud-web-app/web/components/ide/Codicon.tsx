'use client';

import type { HTMLAttributes } from 'react';

// Keep open to support the expanded icon surface used by landing/onboarding/dashboard.
// Rendering safety still comes from the codicon CSS class generation itself.
export type CodiconName = string;

type CodiconProps = HTMLAttributes<HTMLSpanElement> & {
  name: CodiconName;
  label?: string;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function Codicon({ name, label, className, ...rest }: CodiconProps) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={joinClasses('codicon', `codicon-${name}`, className)}
      {...rest}
    />
  );
}
