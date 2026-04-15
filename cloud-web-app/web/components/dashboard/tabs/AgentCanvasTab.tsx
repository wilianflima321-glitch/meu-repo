'use client'

import { useCallback, useState } from 'react'
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'
import '@xyflow/react/dist/style.css'

const INITIAL_NODES: Node[] = [
  {
    id: '1',
    position: { x: 80, y: 40 },
    data: { label: 'Sinal de entrada' },
    type: 'input',
  },
  {
    id: '2',
    position: { x: 320, y: 140 },
    data: { label: 'Orquestrador IA' },
  },
  {
    id: '3',
    position: { x: 560, y: 40 },
    data: { label: 'Saida' },
    type: 'output',
  },
]

const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3' },
]

const panelClass = [
  'rounded-2xl border border-[var(--aethel-border-subtle)]',
  'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)]',
  'shadow-[0_18px_50px_rgba(0,0,0,0.2)]',
].join(' ')

const statCardClass = `${panelClass} flex items-center gap-3 p-4`

export default function AgentCanvasTab() {
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES)
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES)

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((current) => applyNodeChanges(changes, current)),
    []
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((current) => applyEdgeChanges(changes, current)),
    []
  )

  return (
    <div className="flex h-full flex-col gap-8 rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_92%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_96%,transparent))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:p-8">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
        <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--aethel-info-light)]">
          Agent Canvas
        </span>
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--aethel-text-primary)]">Canvas de agentes</h2>
        <p className="max-w-2xl text-sm leading-6 text-[var(--aethel-text-secondary)] lg:text-[15px]">
          Visualize o fluxo entre orquestracao, entradas e saidas do seu sistema de agentes em uma
          superficie mais clara e conectada ao restante do Studio.
        </p>
      </div>

      <div className={`min-h-[500px] flex-1 overflow-hidden p-0 ${panelClass}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          colorMode="dark"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={statCardClass}>
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] p-2 text-[var(--aethel-primary)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Agentes ativos</p>
            <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">4 agentes</p>
          </div>
        </div>
        <div className={statCardClass}>
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] p-2 text-[var(--aethel-success)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Tarefas concluidas</p>
            <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">128 tarefas</p>
          </div>
        </div>
        <div className={statCardClass}>
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-2 text-[var(--aethel-warning-light)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Tempo medio</p>
            <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">1.2s por tarefa</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          aria-label="Abrir tela completa do canvas de agentes"
          className={`rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-focus)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
        >
          Expandir canvas
        </button>
      </div>
    </div>
  )
}
