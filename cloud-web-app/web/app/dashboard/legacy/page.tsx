import { redirect } from 'next/navigation'

export default function DashboardLegacyPage() {
  redirect('/dashboard?legacy=1')
}
