'use client'

export function SearchPanel() {
  return (
    <div className="h-full p-3 text-xs text-slate-300 space-y-2">
      <div className="font-medium text-slate-200">Search</div>
      <div className="text-slate-400">Use Command Palette for fast open and symbol navigation.</div>
      <div className="text-slate-500">Shortcuts: Ctrl+P, Ctrl+Shift+P, Ctrl+G.</div>
    </div>
  )
}

export function GitPanel() {
  return (
    <div className="h-full p-3 text-xs text-slate-300 space-y-2">
      <div className="font-medium text-slate-200">Source Control</div>
      <div className="text-slate-400">Git integration is available through project-level workflows.</div>
      <div className="text-slate-500">This panel will display working tree state after Git bridge activation.</div>
    </div>
  )
}

export function OutputPanel({ projectId, workspaceRoot }: { projectId: string; workspaceRoot: string }) {
  return (
    <div className="h-full p-3 text-xs text-slate-300 space-y-2">
      <div className="font-medium text-slate-200">Output</div>
      <div className="text-slate-400">Workbench runtime is active. Use Terminal for process logs.</div>
      <div className="text-slate-500">Project: {projectId}</div>
      <div className="text-slate-500">Workspace: {workspaceRoot}</div>
    </div>
  )
}

export function ProblemsPanel() {
  return (
    <div className="h-full p-3 text-xs text-slate-300 space-y-2">
      <div className="font-medium text-slate-200">Problems</div>
      <div className="text-slate-400">No diagnostics from backend analyzer in this workspace.</div>
      <div className="text-slate-500">Enable project analyzer to populate this panel.</div>
    </div>
  )
}

export function DebugPanel() {
  return (
    <div className="h-full p-3 text-xs text-slate-300 space-y-2">
      <div className="font-medium text-slate-200">Debug Console</div>
      <div className="text-slate-400">Debug adapter is scoped for P1. Current action: explicit capability gate.</div>
    </div>
  )
}

export function PortsPanel() {
  return (
    <div className="h-full p-3 text-xs text-slate-300 space-y-2">
      <div className="font-medium text-slate-200">Ports</div>
      <div className="text-slate-400">No forwarded ports are currently active in this workspace.</div>
    </div>
  )
}

