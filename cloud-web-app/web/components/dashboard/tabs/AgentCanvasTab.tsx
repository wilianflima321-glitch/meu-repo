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
    <div className="aethel-p-6 aethel-space-y-8 aethel-h-full aethel-flex aethel-flex-column">
      <div className="aethel-text-center">
        <h2 className="aethel-text-2xl aethel-font-bold">Canvas de Agentes</h2>
        <p className="aethel-text-slate-400">Visualize e gerencie o fluxo de trabalho dos seus agentes de IA</p>
      </div>

      <div className="aethel-flex-1 aethel-card aethel-p-0 aethel-overflow-hidden aethel-min-h-[500px]">
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

      <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-3 aethel-gap-4">
        <div className="aethel-card aethel-p-4 aethel-flex aethel-items-center aethel-gap-3">
          <div className="aethel-p-2 aethel-bg-blue-500/10 aethel-rounded-lg">
            <svg className="aethel-w-5 aethel-h-5 aethel-text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="aethel-text-xs aethel-text-slate-500">Agentes ativos</p>
            <p className="aethel-text-sm aethel-font-bold">4 agentes</p>
          </div>
        </div>
        <div className="aethel-card aethel-p-4 aethel-flex aethel-items-center aethel-gap-3">
          <div className="aethel-p-2 aethel-bg-emerald-500/10 aethel-rounded-lg">
            <svg className="aethel-w-5 aethel-h-5 aethel-text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="aethel-text-xs aethel-text-slate-500">Tarefas concluidas</p>
            <p className="aethel-text-sm aethel-font-bold">128 tarefas</p>
          </div>
        </div>
        <div className="aethel-card aethel-p-4 aethel-flex aethel-items-center aethel-gap-3">
          <div className="aethel-p-2 aethel-bg-blue-500/10 aethel-rounded-lg">
            <svg className="aethel-w-5 aethel-h-5 aethel-text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="aethel-text-xs aethel-text-slate-500">Tempo medio</p>
            <p className="aethel-text-sm aethel-font-bold">1.2s por tarefa</p>
          </div>
        </div>
      </div>
    </div>
  )
}

