'use client'

import React from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface AgentCanvasTabProps {
  nodes: any[]
  edges: any[]
  onNodesChange: (changes: any) => void
  onEdgesChange: (changes: any) => void
}

export default function AgentCanvasTab({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
}: AgentCanvasTabProps) {
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
            <p className="aethel-text-xs aethel-text-slate-500">Agentes Ativos</p>
            <p className="aethel-text-sm aethel-font-bold">4 Agentes</p>
          </div>
        </div>
        <div className="aethel-card aethel-p-4 aethel-flex aethel-items-center aethel-gap-3">
          <div className="aethel-p-2 aethel-bg-emerald-500/10 aethel-rounded-lg">
            <svg className="aethel-w-5 aethel-h-5 aethel-text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="aethel-text-xs aethel-text-slate-500">Tarefas Concluídas</p>
            <p className="aethel-text-sm aethel-font-bold">128 Tarefas</p>
          </div>
        </div>
        <div className="aethel-card aethel-p-4 aethel-flex aethel-items-center aethel-gap-3">
          <div className="aethel-p-2 aethel-bg-purple-500/10 aethel-rounded-lg">
            <svg className="aethel-w-5 aethel-h-5 aethel-text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="aethel-text-xs aethel-text-slate-500">Tempo Médio</p>
            <p className="aethel-text-sm aethel-font-bold">1.2s / tarefa</p>
          </div>
        </div>
      </div>
    </div>
  )
}
