'use client'
import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'

const VerifyEmailContent = dynamicImport(() => import('./VerifyEmailContent'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )
})

export default function VerifyEmailPage() {
  return <VerifyEmailContent />
}
