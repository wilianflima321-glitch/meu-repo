import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type AdminPageShellProps = {
  title: string;
  description: string;
  subtitle?: string | null;
  actions?: ReactNode;
  children: ReactNode;
};

type AdminSectionProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

type AdminStatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type AdminStatusBannerProps = {
  tone?: AdminStatusTone;
  children: ReactNode;
};

type AdminStatCardProps = {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'sky' | 'emerald' | 'amber' | 'rose';
};

export function AdminPageShell({
  title,
  description,
  subtitle,
  actions,
  children,
}: AdminPageShellProps) {
  return (
    <div className='mx-auto max-w-6xl p-6'>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>{title}</h1>
          <p className='mt-1 text-zinc-400'>{description}</p>
          {subtitle ? <p className='mt-1 text-xs text-zinc-500'>{subtitle}</p> : null}
        </div>
        {actions ? <div className='flex items-center gap-2'>{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function AdminSection({
  title,
  subtitle,
  children,
  className = '',
}: AdminSectionProps) {
  return (
    <section className={`rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4 shadow ${className}`.trim()}>
      {title ? (
        <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
          <h2 className='text-base font-semibold'>{title}</h2>
          {subtitle ? <span className='text-xs text-zinc-500'>{subtitle}</span> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminStatusBanner({
  tone = 'neutral',
  children,
}: AdminStatusBannerProps) {
  const toneClass =
    tone === 'danger'
      ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
      : tone === 'warning'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
        : tone === 'success'
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
          : tone === 'info'
            ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
            : 'border-zinc-700/70 bg-zinc-900/70 text-zinc-300';

  return <div className={`rounded border px-3 py-2 text-sm ${toneClass}`}>{children}</div>;
}

export function AdminStatGrid({ children }: { children: ReactNode }) {
  return <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>{children}</div>;
}

export function AdminStatCard({
  label,
  value,
  tone = 'neutral',
}: AdminStatCardProps) {
  const valueToneClass =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'sky'
        ? 'text-sky-300'
        : tone === 'amber'
          ? 'text-amber-300'
          : tone === 'rose'
            ? 'text-rose-300'
            : 'text-zinc-200';

  return (
    <div className='rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4'>
      <p className='text-xs uppercase tracking-[0.08em] text-zinc-500'>{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueToneClass}`}>{value}</p>
    </div>
  );
}

export function AdminPrimaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded bg-zinc-800/70 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export function AdminTableStateRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td className='p-3 text-sm text-zinc-500' colSpan={colSpan}>
        {message}
      </td>
    </tr>
  );
}
