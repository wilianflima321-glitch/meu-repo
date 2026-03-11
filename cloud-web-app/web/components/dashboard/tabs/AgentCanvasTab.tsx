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
    <div className="aethel-p-6 space-y-8 h-full aethel-flex flex-column">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Canvas de Agentes</h2>
        <p className="text-slate-400">Visualize e gerencie o fluxo de trabalho dos seus agentes de IA</p>
      </div>

      <div className="flex-1 aethel-card p-0 overflow-hidden min-h-[500px]">
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

      <div className="grid grid-cols-1 md:grid-cols-3 aethel-gap-4">
        <div className="aethel-card aethel-p-4 aethel-flex aethel-items-center aethel-gap-3">
          <div className="aethel-p-2 bg-blue-500/10 aethel-rounded-lg">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500">Agentes ativos</p>
            <p className="text-sm font-bold">4 agentes</p>
          </div>
        </div>
        <div className="aethel-card aethel-p-4 aethel-flex aethel-items-center aethel-gap-3">
          <div className="aethel-p-2 bg-emerald-500/10 aethel-rounded-lg">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500">Tarefas concluidas</p>
            <p className="text-sm font-bold">128 tarefas</p>
          </div>
        </div>
        <div className="aethel-card aethel-p-4 aethel-flex aethel-items-center aethel-gap-3">
          <div className="aethel-p-2 bg-blue-500/10 aethel-rounded-lg">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500">Tempo medio</p>
            <p className="text-sm font-bold">1.2s por tarefa</p>
          </div>
        </div>
      </div>
    </div>
  )
}

