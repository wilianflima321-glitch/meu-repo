import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

function VerifyEmailFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] px-4 py-10 text-[var(--aethel-text-primary)]">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_88%,transparent)] p-6 shadow-2xl shadow-[0_24px_70px_rgba(2,8,23,0.35)]">
        <p className="text-sm text-[var(--aethel-text-secondary)]">Carregando verificacao...</p>
      </div>
    </main>
  )
}

const VerifyEmailPageContent = nextDynamic(() => import('./verify-email-content'), {
  ssr: false,
  loading: () => <VerifyEmailFallback />,
})

export default function VerifyEmailPage() {
  return <VerifyEmailPageContent />
}
