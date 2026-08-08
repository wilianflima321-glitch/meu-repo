import type { Meta, StoryObj } from '@storybook/react'
import { ModernIDEShell } from './ModernIDEShell'

const EditorStub = () => (
  <div className="flex h-full items-center justify-center bg-[var(--aethel-surface-primary)]">
    <p className="text-[12px] text-[var(--aethel-text-quaternary)]">Editor slot</p>
  </div>
)

const SidebarStub = () => (
  <div className="flex h-full flex-col gap-2 p-3">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="h-6 rounded-md bg-[var(--aethel-surface-secondary)] opacity-60" />
    ))}
  </div>
)

const PreviewStub = ({ label = 'Preview' }: { label?: string }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 bg-[var(--aethel-surface-secondary)]">
    <div className="h-8 w-8 rounded-full border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-elevated)]" />
    <p className="text-[11px] text-[var(--aethel-text-tertiary)]">{label}</p>
  </div>
)

const ChatStub = () => (
  <div className="flex h-full flex-col p-3">
    <div className="mb-3 flex-1 space-y-2">
      {['What should I build next?', '-> Try adding authentication', 'How do I deploy this?', '-> Click Deploy in the header'].map((t, i) => (
        <div key={i} className={`rounded-xl px-3 py-2 text-[11px] ${i % 2 === 0 ? 'ml-4 bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-secondary)]' : 'mr-4 bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] text-[var(--aethel-primary-light)]'}`}>
          {t}
        </div>
      ))}
    </div>
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] px-3 py-2 text-[11px] text-[var(--aethel-text-quaternary)]">
      Ask anything...
    </div>
  </div>
)

const TerminalStub = () => (
  <div className="h-full bg-[var(--aethel-surface-primary)] p-3 font-mono text-[11px] text-[var(--aethel-success-light)]">
    <p>$ npm run dev</p>
    <p className="opacity-70">Next.js started on http://localhost:3000</p>
    <p className="opacity-70">Ready in 842ms</p>
  </div>
)

const defaultSlots = {
  sidebar: <SidebarStub />,
  editor: <EditorStub />,
  preview: <PreviewStub />,
  chat: <ChatStub />,
  terminal: <TerminalStub />,
}

const meta = {
  title: 'Shells/ModernIDEShell',
  component: ModernIDEShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The canonical IDE shell. All IDE workbench pages must use this shell; no parallel shells allowed.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', width: '100vw' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ModernIDEShell>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {
  name: 'Idle default',
  args: {
    projectName: 'my-app',
    activeFileName: 'src/app/page.tsx',
    children: defaultSlots,
    sidebarOpen: true,
    activeSidebarTab: 'explorer',
    activePreviewMode: 'runtime',
    activeBottomPanel: 'chat',
    statusBarProps: {
      activeFilePath: 'src/app/page.tsx',
      activeFileLanguage: 'typescript',
      collaborationConnected: true,
      collaboratorCount: 2,
    },
  },
}

export const AgentRunning: Story = {
  name: 'Agent running',
  args: {
    ...Idle.args,
    projectName: 'my-app',
    activeFileName: 'src/components/Button.tsx',
    activeBottomPanel: 'chat',
    children: {
      ...defaultSlots,
      preview: <PreviewStub label="Live preview - port 3000" />,
    },
    statusBarProps: {
      activeFilePath: 'src/components/Button.tsx',
      activeFileLanguage: 'typescript',
      runtimeReadinessStatus: 'agent-executing',
    },
  },
}

export const PanelError: Story = {
  name: 'Panel error boundary',
  args: {
    ...Idle.args,
    projectName: 'broken-project',
    children: {
      ...defaultSlots,
      editor: (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-5 py-4">
            <p className="text-[12px] font-semibold text-[var(--aethel-error-light)]">Editor failed to load</p>
            <p className="mt-1 text-[11px] text-[var(--aethel-text-secondary)]">The editor encountered an unexpected error. Try reloading.</p>
          </div>
        </div>
      ),
    },
    statusBarProps: { runtimeReadinessStatus: 'error' },
  },
}

export const Compact: Story = {
  name: 'Compact mobile',
  args: {
    ...Idle.args,
    children: {
      ...defaultSlots,
      preview: <PreviewStub label="Preview hidden on mobile" />,
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', width: '390px' }}>
        <Story />
      </div>
    ),
  ],
}
