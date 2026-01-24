import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/landing/LandingPage'

export default function Page() {
  const token = cookies().get('token')?.value
  if (token) {
    redirect('/dashboard')
  }

  return <LandingPage />
}
