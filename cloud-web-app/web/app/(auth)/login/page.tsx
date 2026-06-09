import { Suspense } from 'react'
import LoginPageV2 from './login-v2'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--aethel-surface-primary)]" />}>
      <LoginPageV2 />
    </Suspense>
  )
}
