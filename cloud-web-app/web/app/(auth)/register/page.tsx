import { Suspense } from 'react';
import RegisterPageV2 from './register-v2';

function RegisterPageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] px-4 py-10 text-[var(--aethel-text-primary)]">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_88%,transparent)] p-6 shadow-2xl shadow-[0_24px_70px_rgba(2,8,23,0.35)]">
        <p className="text-sm text-[var(--aethel-text-secondary)]">Carregando cadastro...</p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageFallback />}>
      <RegisterPageV2 />
    </Suspense>
  );
}
