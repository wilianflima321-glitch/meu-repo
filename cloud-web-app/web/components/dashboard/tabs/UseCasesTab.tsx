'use client'

import React from 'react'
import type { UseCase } from '../aethel-dashboard-model'

interface UseCasesTabProps {
  useCases: UseCase[]
  onSelect: (useCaseId: string) => void
}

export default function UseCasesTab({ useCases, onSelect }: UseCasesTabProps) {
  return (
    <div className="aethel-p-6 space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Casos de Uso</h2>
        <p className="text-slate-400">Exemplos práticos de como o Aethel pode acelerar seu fluxo de trabalho</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 aethel-gap-6">
        {useCases.map((useCase) => (
          <div key={useCase.id} className="aethel-card aethel-p-6 aethel-flex flex-column">
            <div className="mb-4">
              <div className="aethel-flex aethel-items-center aethel-justify-between mb-2">
                <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded-full uppercase">
                  {useCase.category}
                </span>
                <span className="text-xs text-slate-500">
                  {useCase.difficulty === 'beginner' ? 'Iniciante' : useCase.difficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}
                </span>
              </div>
              <h3 className="text-xl font-bold">{useCase.name}</h3>
              <p className="text-sm text-slate-400 mt-2">{useCase.description}</p>
            </div>
            
            <div className="flex-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Funcionalidades principais</div>
              <ul className="space-y-1">
                {useCase.features.slice(0, 3).map((feature, i) => (
                  <li key={i} className="text-xs text-slate-300 aethel-flex aethel-items-center aethel-gap-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    {feature}
                  </li>
                ))}
                {useCase.features.length > 3 && (
                  <li className="text-xs text-slate-500">+ {useCase.features.length - 3} mais</li>
                )}
              </ul>
            </div>

            <button
              onClick={() => onSelect(useCase.id)}
              className="aethel-button aethel-button-secondary w-full mt-6"
            >
              Explorar Caso de Uso
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
