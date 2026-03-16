import dynamic from 'next/dynamic'

// Load workbench shell dynamically to reduce initial bundle cost.
const FullscreenIDE = dynamic(() => import('@/components/ide/FullscreenIDE'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen flex items-center justify-center bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-tertiary)]">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-[var(--aethel-border-secondary)] border-t-zinc-400 rounded-full animate-spin"></div>
        <span>Carregando o workspace...</span>
      </div>
    </div>
  ),
});

export default function IDEPage() {
  return <FullscreenIDE />;
}
