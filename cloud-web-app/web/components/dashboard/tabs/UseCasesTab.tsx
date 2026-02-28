'use client'

import React from 'react'
import type { UseCase } from '../aethel-dashboard-model'

interface UseCasesTabProps {
  useCases: UseCase[]
  onSelect: (useCaseId: string) => void
}

export default function UseCasesTab({ useCases, onSelect }: UseCasesTabProps) {
  return (
    <div className="aethel-p-6 aethel-space-y-8">
      <div className="aethel-text-center">
        <h2 className="aethel-text-2xl aethel-font-bold">Casos de Uso</h2>
        <p className="aethel-text-slate-400">Exemplos práticos de como o Aethel pode acelerar seu fluxo de trabalho</p>
      </div>

      <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-6">
        {useCases.map((useCase) => (
          <div key={useCase.id} className="aethel-card aethel-p-6 aethel-flex aethel-flex-column">
            <div className="aethel-mb-4">
              <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-2">
                <span className="aethel-px-2 aethel-py-1 aethel-bg-blue-500/10 aethel-text-blue-500 aethel-text-[10px] aethel-font-bold aethel-rounded-full aethel-uppercase">
                  {useCase.category}
                </span>
                <span className="aethel-text-xs aethel-text-slate-500">
                  {useCase.difficulty === 'beginner' ? 'Iniciante' : useCase.difficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}
                </span>
              </div>
              <h3 className="aethel-text-xl aethel-font-bold">{useCase.name}</h3>
              <p className="aethel-text-sm aethel-text-slate-400 aethel-mt-2">{useCase.description}</p>
            </div>
            
            <div className="aethel-flex-1">
              <div className="aethel-text-[10px] aethel-font-bold aethel-text-slate-500 aethel-uppercase aethel-mb-2">Funcionalidades principais</div>
              <ul className="aethel-space-y-1">
                {useCase.features.slice(0, 3).map((feature, i) => (
                  <li key={i} className="aethel-text-xs aethel-text-slate-300 aethel-flex aethel-items-center aethel-gap-2">
                    <div className="aethel-w-1 aethel-h-1 aethel-bg-blue-500 aethel-rounded-full"></div>
                    {feature}
                  </li>
                ))}
                {useCase.features.length > 3 && (
                  <li className="aethel-text-xs aethel-text-slate-500">+ {useCase.features.length - 3} mais</li>
                )}
              </ul>
            </div>

            <button
              onClick={() => onSelect(useCase.id)}
              className="aethel-button aethel-button-secondary aethel-w-full aethel-mt-6"
            >
              Explorar Caso de Uso
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
