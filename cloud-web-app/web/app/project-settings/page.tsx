'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, FolderCog, Wrench } from 'lucide-react'

const ProjectSettings = dynamic(() => import('@/components/engine/ProjectSettings'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-950 text-slate-300">
      <div className="text-center">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <div className="text-sm">Loading project settings...</div>
      </div>
    </div>
  ),
})

export default function ProjectSettingsPage() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')?.trim() || 'default'

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Global Settings
            </Link>
            <div className="flex items-center gap-2">
              <div className="rounded border border-slate-700 bg-slate-900 p-1.5 text-sky-300">
                <FolderCog className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">Project Settings</div>
                <div className="text-[11px] text-slate-500">
                  Runtime, engine, and project-level configuration for the active workspace.
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">projectId: {projectId}</div>
              </div>
            </div>
          </div>
          <Link
            href={`/ide?projectId=${encodeURIComponent(projectId)}`}
            className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <Wrench className="h-3.5 w-3.5" />
            Back to IDE
          </Link>
        </div>
      </header>

      <section className="mx-auto h-[calc(100vh-64px)] w-full max-w-[1600px] px-4 py-4">
        <div className="h-full overflow-hidden rounded border border-slate-800 bg-slate-900/50">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-slate-950 text-slate-300">
                Loading project settings...
              </div>
            }
          >
            <ProjectSettings />
          </Suspense>
        </div>
      </section>
    </main>
  )
}
