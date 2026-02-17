'use client';

import type { HTMLAttributes } from 'react';

export type CodiconName =
  | 'symbol-file'
  | 'files'
  | 'folder'
  | 'folder-opened'
  | 'search'
  | 'source-control'
  | 'sparkle'
  | 'extensions'
  | 'terminal'
  | 'output'
  | 'warning'
  | 'debug'
  | 'plug'
  | 'layout-sidebar-left'
  | 'layout-panel'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'x'
  | 'add'
  | 'new-file'
  | 'new-folder'
  | 'refresh'
  | 'menu'
  | 'rocket'
  | 'git-branch'
  | 'comment-discussion'
  | 'circle-filled'
  | 'fold-up'
  | 'fold-down'
  | 'symbol-number'
  | 'symbol-color'
  | 'gear'
  | 'edit'
  | 'trash';

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
