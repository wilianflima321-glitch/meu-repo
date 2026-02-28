'use client'

import React from 'react'
import type { WorkflowTemplate } from '../aethel-dashboard-model'

interface TemplatesTabProps {
  templates: WorkflowTemplate[]
  onSelect: (templateId: string) => void
}

export default function TemplatesTab({ templates, onSelect }: TemplatesTabProps) {
  return (
    <div className="aethel-p-6 aethel-space-y-8">
      <div className="aethel-text-center">
        <h2 className="aethel-text-2xl aethel-font-bold">Modelos de Workflow</h2>
        <p className="aethel-text-slate-400">Comece rapidamente com estruturas pré-configuradas para diferentes casos de uso</p>
      </div>

      <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-6">
        {templates.map((template) => (
          <div key={template.id} className="aethel-card aethel-p-6 aethel-flex aethel-flex-column">
            <div className="aethel-mb-4">
              <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-2">
                <span className="aethel-px-2 aethel-py-1 aethel-bg-emerald-500/10 aethel-text-emerald-500 aethel-text-[10px] aethel-font-bold aethel-rounded-full aethel-uppercase">
                  {template.category}
                </span>
                <span className="aethel-text-xs aethel-text-slate-500">
                  {template.difficulty === 'beginner' ? 'Iniciante' : template.difficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}
                </span>
              </div>
              <h3 className="aethel-text-xl aethel-font-bold">{template.name}</h3>
              <p className="aethel-text-sm aethel-text-slate-400 aethel-mt-2">{template.description}</p>
            </div>
            
            <div className="aethel-flex-1">
              <div className="aethel-text-[10px] aethel-font-bold aethel-text-slate-500 aethel-uppercase aethel-mb-2">Ações incluídas</div>
              <ul className="aethel-space-y-1">
                {template.steps.slice(0, 3).map((step, i) => (
                  <li key={i} className="aethel-text-xs aethel-text-slate-300 aethel-flex aethel-items-center aethel-gap-2">
                    <div className="aethel-w-1 aethel-h-1 aethel-bg-emerald-500 aethel-rounded-full"></div>
                    {step}
                  </li>
                ))}
                {template.steps.length > 3 && (
                  <li className="aethel-text-xs aethel-text-slate-500">+ {template.steps.length - 3} mais</li>
                )}
              </ul>
            </div>

            <button
              onClick={() => onSelect(template.id)}
              className="aethel-button aethel-button-secondary aethel-w-full aethel-mt-6"
            >
              Usar Modelo
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
