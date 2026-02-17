'use client';

import Link from 'next/link';

export default function BillingSuccessPage() {
  return (
    <main className='min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6'>
      <div className='max-w-xl w-full rounded-xl border border-slate-800 bg-slate-900 p-6'>
        <h1 className='text-2xl font-semibold mb-2'>Pagamento confirmado</h1>
        <p className='text-sm text-slate-400 mb-4'>Sua assinatura foi iniciada. O plano será aplicado após o webhook de confirmação.</p>
        <div className='flex gap-2'>
          <Link href='/billing' className='px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm'>
            Voltar para Billing
          </Link>
          <Link href='/dashboard' className='px-4 py-2 rounded border border-slate-700 hover:bg-slate-800 text-sm'>
            Ir para Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
