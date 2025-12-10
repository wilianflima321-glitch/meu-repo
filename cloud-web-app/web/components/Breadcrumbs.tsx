'use client';

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
    <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-3 text-sm">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <span className="mx-2 text-slate-600">›</span>
          )}
          <button
            onClick={() => handleClick(item)}
            disabled={!item.path}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              item.path
                ? 'text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer'
                : 'text-white cursor-default'
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
