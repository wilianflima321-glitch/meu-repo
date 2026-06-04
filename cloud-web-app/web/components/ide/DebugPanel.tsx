'use client'

/**
 * Debug Panel - orchestration shell.
 * UI primitives live in DebugPanel.parts.tsx so the IDE can evolve without a single debug god component.
 */

import { useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Circle,
  Eye,
  Layers,
  Pause,
  Play,
  RefreshCw,
  Square,
  Terminal,
  Variable,
} from 'lucide-react'
import {
  BreakpointList,
  CallStack,
  CollapsibleSection,
  ConsoleOutput,
  VariableTree,
  WatchExpressions,
  type DebugSession,
} from './DebugPanel.parts'

// ============= Main Debug Panel Component =============

export interface DebugPanelProps {
  session?: DebugSession
  onPlay?: () => void
  onPause?: () => void
  onStop?: () => void
  onStepOver?: () => void
  onStepInto?: () => void
  onStepOut?: () => void
  onRestart?: () => void
  onToggleBreakpoint?: (id: string) => void
  onRemoveBreakpoint?: (id: string) => void
  onAddWatch?: (expression: string) => void
  onRemoveWatch?: (id: string) => void
  onNavigateToFile?: (filePath: string, line: number) => void
}

export default function DebugPanel({
  session,
  onPlay = () => {},
  onPause = () => {},
  onStop = () => {},
  onStepOver = () => {},
  onStepInto = () => {},
  onStepOut = () => {},
  onRestart = () => {},
  onToggleBreakpoint = () => {},
  onRemoveBreakpoint = () => {},
  onAddWatch = () => {},
  onRemoveWatch = () => {},
  onNavigateToFile = () => {},
}: DebugPanelProps) {
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'variables' | 'watch' | 'console'>('variables')

  // Mock session for demo
  const demoSession: DebugSession = session || {
    id: 'demo',
    name: 'Node.js Debug',
    type: 'node',
    state: 'paused',
    breakpoints: [
      { id: '1', filePath: 'src/index.ts', line: 42, enabled: true, verified: true },
      { id: '2', filePath: 'src/utils.ts', line: 15, enabled: true, verified: true, condition: 'x > 10' },
      { id: '3', filePath: 'src/api.ts', line: 88, enabled: false, verified: false },
    ],
    callStack: [
      {
        id: 'frame-1',
        name: 'processRequest',
        filePath: 'src/api.ts',
        line: 45,
        column: 12,
        scopes: [
          {
            name: 'Local',
            type: 'local',
            variables: [
              { name: 'request', value: '{method: "GET", url: "/api/users"}', type: 'object', expandable: true },
              { name: 'response', value: 'undefined', type: 'undefined', expandable: false },
              { name: 'userId', value: '42', type: 'number', expandable: false, changed: true },
            ],
          },
        ],
      },
      {
        id: 'frame-2',
        name: 'handleRoute',
        filePath: 'src/router.ts',
        line: 23,
        column: 8,
        scopes: [],
      },
      {
        id: 'frame-3',
        name: 'main',
        filePath: 'src/index.ts',
        line: 10,
        column: 4,
        scopes: [],
      },
    ],
    watchExpressions: [
      { id: 'w1', expression: 'request.method', result: '"GET"' },
      { id: 'w2', expression: 'users.length', result: '5' },
      { id: 'w3', expression: 'invalidVar', error: 'ReferenceError: invalidVar is not defined' },
    ],
    console: [
      { id: 'c1', type: 'log', message: 'Server started on port 3000', timestamp: new Date() },
      { id: 'c2', type: 'info', message: 'Database connected', timestamp: new Date() },
      { id: 'c3', type: 'warn', message: 'Deprecated API usage in utils.ts', timestamp: new Date(), source: 'utils.ts', line: 25 },
      { id: 'c4', type: 'error', message: 'Failed to fetch user: Network error', timestamp: new Date(), source: 'api.ts', line: 67 },
      { id: 'c5', type: 'log', message: 'Request: GET /api/users/42', timestamp: new Date() },
    ],
  }

  const currentFrame = demoSession.callStack.find(f => f.id === selectedFrameId) || demoSession.callStack[0]

  const isPaused = demoSession.state === 'paused'
  const isRunning = demoSession.state === 'running'

  return (
    <div className="flex flex-col h-full bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]">
      {/* Debug toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[var(--aethel-surface-tertiary)] border-b border-[var(--aethel-border-secondary)]">
        {/* Play/Pause */}
        {isPaused ? (
          <button type="button" aria-label="Continue debugging"
            onClick={onPlay}
            className="p-1.5 bg-[var(--aethel-success)] hover:brightness-110 rounded text-[var(--aethel-text-primary)]"
            title="Continue (F5)"
          >
            <Play className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" aria-label="Pause debugging"
            onClick={onPause}
            className="p-1.5 bg-[var(--aethel-warning-dark)] hover:bg-[var(--aethel-warning)] rounded text-[var(--aethel-text-primary)]"
            title="Pause (F6)"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}

        {/* Stop */}
        <button type="button" aria-label="Stop debugging"
          onClick={onStop}
          className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-error)]"
          title="Stop (Shift+F5)"
        >
          <Square className="w-4 h-4" />
        </button>

        {/* Restart */}
        <button type="button" aria-label="Restart debugging"
          onClick={onRestart}
          className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)]"
          title="Restart (Ctrl+Shift+F5)"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-[var(--aethel-surface-quaternary)] mx-1" />

        {/* Step controls */}
        <button type="button" aria-label="Step over"
          onClick={onStepOver}
          disabled={!isPaused}
          className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)] disabled:opacity-50"
          title="Step over (F10)"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <button type="button" aria-label="Step into"
          onClick={onStepInto}
          disabled={!isPaused}
          className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)] disabled:opacity-50"
          title="Step into (F11)"
        >
          <ArrowDown className="w-4 h-4" />
        </button>

        <button type="button" aria-label="Step out"
          onClick={onStepOut}
          disabled={!isPaused}
          className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)] disabled:opacity-50"
          title="Step out (Shift+F11)"
        >
          <ArrowUp className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Session info */}
        <span className="text-xs text-[var(--aethel-text-tertiary)]">
          {demoSession.name}
        </span>
        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
          isPaused ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning-light)]' :
          isRunning ? 'bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] text-[var(--aethel-success-light)]' :
          'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)]'
        }`}>
          {demoSession.state}
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Breakpoints, Call Stack, Variables */}
        <div className="w-72 border-r border-[var(--aethel-border-secondary)] overflow-y-auto">
          <CollapsibleSection
            title="Breakpoints"
            icon={<Circle className="w-4 h-4 text-[var(--aethel-error)]" />}
            badge={demoSession.breakpoints.filter(b => b.enabled).length}
          >
            <BreakpointList
              breakpoints={demoSession.breakpoints}
              onToggle={onToggleBreakpoint}
              onRemove={onRemoveBreakpoint}
              onEdit={() => {}}
              onNavigate={(bp) => onNavigateToFile(bp.filePath, bp.line)}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Call stack"
            icon={<Layers className="w-4 h-4 text-[var(--aethel-info-light)]" />}
            badge={demoSession.callStack.length}
          >
            <CallStack
              frames={demoSession.callStack}
              selectedFrameId={selectedFrameId || demoSession.callStack[0]?.id}
              onSelectFrame={(frame) => {
                setSelectedFrameId(frame.id)
                onNavigateToFile(frame.filePath, frame.line)
              }}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Variables"
            icon={<Variable className="w-4 h-4 text-[var(--aethel-success-light)]" />}
          >
            {currentFrame?.scopes.map(scope => (
              <div key={scope.name} className="mb-2">
                <div className="px-3 py-1 text-xs text-[var(--aethel-text-tertiary)] uppercase">
                  {scope.name}
                </div>
                <VariableTree variables={scope.variables} />
              </div>
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            title="Watch"
            icon={<Eye className="w-4 h-4 text-[var(--aethel-info-light)]" />}
            badge={demoSession.watchExpressions.length}
          >
            <WatchExpressions
              expressions={demoSession.watchExpressions}
              onAdd={onAddWatch}
              onRemove={onRemoveWatch}
              onEdit={() => {}}
            />
          </CollapsibleSection>
        </div>

        {/* Right panel - Console */}
        <div className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-2 py-1 bg-[var(--aethel-surface-tertiary)] border-b border-[var(--aethel-border-secondary)]">
            <button type="button" aria-label="Open debug console tab"
              onClick={() => setActiveTab('console')}
              className={`px-3 py-1 text-xs rounded ${
                activeTab === 'console'
                  ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              <Terminal className="w-3 h-3 inline mr-1" />
              Console
            </button>
          </div>

          {/* Console content */}
          <div className="flex-1 overflow-hidden">
            <ConsoleOutput
              messages={demoSession.console}
              onClear={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
