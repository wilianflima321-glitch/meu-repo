import Link from 'next/link'

export default function WorkbenchRedirect({
  title = 'Workbench',
  description,
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur p-8 text-center">
        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-3">Unified Workbench</div>
        <h1 className="text-xl font-semibold mb-3">{title}</h1>
        <p className="text-sm text-slate-400 mb-6">
          {description || 'This capability is available only inside the Workbench shell.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/ide"
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium"
          >
            Open Workbench
          </Link>
        </div>
      </div>
    </div>
  )
}
