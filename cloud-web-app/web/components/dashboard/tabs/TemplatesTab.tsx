'use client'

import React from 'react'
import type { WorkflowTemplate } from '../aethel-dashboard-model'

interface TemplatesTabProps {
  templates: WorkflowTemplate[]
  onSelect: (templateId: string) => void
}

export default function TemplatesTab({ templates, onSelect }: TemplatesTabProps) {
  return (
    <div className="aethel-p-6 space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Modelos de Workflow</h2>
        <p className="text-slate-400">Comece rapidamente com estruturas pré-configuradas para diferentes casos de uso</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 aethel-gap-6">
        {templates.map((template) => (
          <div key={template.id} className="aethel-card aethel-p-6 aethel-flex flex-column">
            <div className="mb-4">
              <div className="aethel-flex aethel-items-center aethel-justify-between mb-2">
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-full uppercase">
                  {template.category}
                </span>
                <span className="text-xs text-slate-500">
                  {template.difficulty === 'beginner' ? 'Iniciante' : template.difficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}
                </span>
              </div>
              <h3 className="text-xl font-bold">{template.name}</h3>
              <p className="text-sm text-slate-400 mt-2">{template.description}</p>
            </div>
            
            <div className="flex-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Ações incluídas</div>
              <ul className="space-y-1">
                {template.steps.slice(0, 3).map((step, i) => (
                  <li key={i} className="text-xs text-slate-300 aethel-flex aethel-items-center aethel-gap-2">
                    <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                    {step}
                  </li>
                ))}
                {template.steps.length > 3 && (
                  <li className="text-xs text-slate-500">+ {template.steps.length - 3} mais</li>
                )}
              </ul>
            </div>

            <button
              onClick={() => onSelect(template.id)}
              className="aethel-button aethel-button-secondary w-full mt-6"
            >
              Usar Modelo
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
