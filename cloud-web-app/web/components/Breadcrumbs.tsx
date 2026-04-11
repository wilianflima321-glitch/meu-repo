/**
 * @deprecated Use canonical equivalent from @/components/ui/ instead.
 * Migration guide: cloud-web-app/web/components/COMPONENT_CONSOLIDATION_MAP.md
 * Source: docs/master/76_AUDITORIA_DEFINITIVA_BENCHMARK_2026-04-11.md
 */
/**
 * @deprecated Use the canonical editor breadcrumbs from `@/components/editor/Breadcrumbs`
 * or route-level breadcrumbs via App Router layouts.
 */
'use client';;

import { useRouter } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const router = useRouter();

  const handleClick = (item: BreadcrumbItem) => {
    if (item.path) {
      router.push(item.path);
    }
  };

  return (
    <div className="h-8 bg-[var(--aethel-surface-tertiary)] border-b border-[var(--aethel-border-primary)] flex items-center px-3 text-sm">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <span className="mx-2 text-[var(--aethel-text-quaternary)]">›</span>
          )}
          <button type="button"
            onClick={() => handleClick(item)}
            disabled={!item.path}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              item.path
                ? 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)] hover:text-[var(--aethel-text-primary)] cursor-pointer'
                : 'text-[var(--aethel-text-primary)] cursor-default'
            }`}
          >
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
