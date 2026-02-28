'use client'

import React from 'react'

interface DownloadOption {
  id: string
  platform: 'windows' | 'mac' | 'linux'
  name: string
  description: string
  size: string
  version: string
  icon: React.ReactNode
  color: string
}

interface DownloadTabProps {
  onDownload: (platform: string) => void
}

const DOWNLOAD_OPTIONS: DownloadOption[] = [
  {
    id: 'windows',
    platform: 'windows',
    name: 'Instalador Windows',
    description: 'Instalação completa para Windows 10/11',
    size: '~250 MB',
    version: 'v2.1.0',
    color: 'aethel-from-blue-500 aethel-to-cyan-600',
    icon: (
      <svg className="aethel-w-8 aethel-h-8 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'mac',
    platform: 'mac',
    name: 'Instalador macOS',
    description: 'App nativo para macOS 11+',
    size: '~220 MB',
    version: 'v2.1.0',
    color: 'aethel-from-blue-500 aethel-to-cyan-600',
    icon: (
      <svg className="aethel-w-8 aethel-h-8 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'linux',
    platform: 'linux',
    name: 'Instalador Linux',
    description: 'Pacote Linux universal',
    size: '~200 MB',
    version: 'v2.1.0',
    color: 'aethel-from-orange-500 aethel-to-red-600',
    icon: (
      <svg className="aethel-w-8 aethel-h-8 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
]

export default function DownloadTab({ onDownload }: DownloadTabProps) {
  return (
    <div className="aethel-p-6 aethel-space-y-12">
      <div className="aethel-text-center">
        <h2 className="aethel-text-3xl aethel-font-bold aethel-mb-4">Baixar Aethel IDE</h2>
        <p className="aethel-text-lg aethel-text-slate-400 aethel-max-w-2xl aethel-mx-auto">
          Experimente todo o poder do Aethel com a nossa IDE local. Inclui integração com IA,
          ferramentas avançadas de código e conectividade total com o backend.
          <br /><br />
          <strong>Gratuito para uso pessoal • Recursos profissionais disponíveis</strong>
        </p>
      </div>

      <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-8 aethel-max-w-6xl aethel-mx-auto">
        {DOWNLOAD_OPTIONS.map((option) => (
          <div key={option.id} className="aethel-card aethel-p-6">
            <div className="aethel-text-center aethel-mb-6">
              <div className={`aethel-w-16 aethel-h-16 aethel-bg-gradient-to-r ${option.color} aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-4`}>
                {option.icon}
              </div>
              <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2">{option.name}</h3>
              <p className="aethel-text-slate-400">{option.description}</p>
            </div>
            <div className="aethel-space-y-3">
              <div className="aethel-flex aethel-justify-between aethel-text-sm">
                <span>Tamanho:</span>
                <span>{option.size}</span>
              </div>
              <div className="aethel-flex aethel-justify-between aethel-text-sm">
                <span>Versão:</span>
                <span>{option.version}</span>
              </div>
              <button
                onClick={() => onDownload(option.platform)}
                className="aethel-button aethel-button-primary aethel-w-full aethel-mt-4"
              >
                {option.platform === 'mac' ? '🍎 ' : option.platform === 'linux' ? '🐧 ' : ''}
                Baixar para {option.platform.charAt(0).toUpperCase() + option.platform.slice(1)}
              </button>
            </div>
          </div>
        ))}

        <div className="aethel-card aethel-p-6">
          <div className="aethel-text-center aethel-mb-6">
            <div className="aethel-w-16 aethel-h-16 aethel-bg-gradient-to-r aethel-from-green-500 aethel-to-teal-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-4">
              <svg className="aethel-w-8 aethel-h-8 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2">Requisitos do sistema</h3>
            <p className="aethel-text-slate-400">Verifique se seu hardware é compatível</p>
          </div>
          <ul className="aethel-space-y-2 aethel-text-sm aethel-text-slate-300">
            <li className="aethel-flex aethel-justify-between">
              <span>RAM:</span>
              <span className="aethel-text-white">8GB+ Recomendado</span>
            </li>
            <li className="aethel-flex aethel-justify-between">
              <span>CPU:</span>
              <span className="aethel-text-white">Quad-core 2GHz+</span>
            </li>
            <li className="aethel-flex aethel-justify-between">
              <span>Espaço:</span>
              <span className="aethel-text-white">1GB Livre</span>
            </li>
            <li className="aethel-flex aethel-justify-between">
              <span>Internet:</span>
              <span className="aethel-text-white">Conexão Estável</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
