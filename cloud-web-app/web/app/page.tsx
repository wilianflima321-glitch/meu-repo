import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default function Page() {
  const token = cookies().get('token')?.value
  if (token) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight">Aethel</h1>
          <p className="mt-3 text-lg text-gray-300">
            Professional portal with Studio Home entry, billing, usage quotas and advanced IDE handoff.
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-700"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-900"
          >
            Create account
          </Link>
          <Link
            href="/terms"
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
          >
            Terms
          </Link>
        </div>

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5">
            <h2 className="text-base font-semibold">Studio Home</h2>
            <p className="mt-2 text-sm text-gray-300">
              Chat-first mission control with super plans, team agents, live preview and operational cost tracking.
            </p>
            <div className="mt-4">
              <Link href="/login" className="text-sm text-sky-400 hover:text-sky-300">
                Enter Studio Home
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5">
            <h2 className="text-base font-semibold">Advanced IDE</h2>
            <p className="mt-2 text-sm text-gray-300">
              /ide remains the advanced mode for precise edits, debugging and deep project operations.
            </p>
            <div className="mt-4">
              <p className="text-xs text-gray-400">
                One-click handoff from Studio Home keeps projectId and active context.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
