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
    color: 'from-blue-500 to-cyan-600',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    color: 'from-blue-500 to-cyan-600',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    color: 'from-orange-500 to-red-600',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
]

export default function DownloadTab({ onDownload }: DownloadTabProps) {
  return (
    <div className="aethel-p-6 space-y-12">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Baixar Aethel IDE</h2>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Experimente todo o poder do Aethel com a nossa IDE local. Inclui integração com IA,
          ferramentas avançadas de código e conectividade total com o backend.
          <br /><br />
          <strong>Gratuito para uso pessoal • Recursos profissionais disponíveis</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 aethel-gap-8 max-w-6xl mx-auto">
        {DOWNLOAD_OPTIONS.map((option) => (
          <div key={option.id} className="aethel-card aethel-p-6">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 bg-gradient-to-r ${option.color} rounded-full aethel-flex aethel-items-center aethel-justify-center mx-auto mb-4`}>
                {option.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{option.name}</h3>
              <p className="text-slate-400">{option.description}</p>
            </div>
            <div className="space-y-3">
              <div className="aethel-flex aethel-justify-between text-sm">
                <span>Tamanho:</span>
                <span>{option.size}</span>
              </div>
              <div className="aethel-flex aethel-justify-between text-sm">
                <span>Versão:</span>
                <span>{option.version}</span>
              </div>
              <button
                onClick={() => onDownload(option.platform)}
                className="aethel-button aethel-button-primary w-full mt-4"
              >
                {option.platform === 'mac' ? '🍎 ' : option.platform === 'linux' ? '🐧 ' : ''}
                Baixar para {option.platform.charAt(0).toUpperCase() + option.platform.slice(1)}
              </button>
            </div>
          </div>
        ))}

        <div className="aethel-card aethel-p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-full aethel-flex aethel-items-center aethel-justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Requisitos do sistema</h3>
            <p className="text-slate-400">Verifique se seu hardware é compatível</p>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="aethel-flex aethel-justify-between">
              <span>RAM:</span>
              <span className="text-white">8GB+ Recomendado</span>
            </li>
            <li className="aethel-flex aethel-justify-between">
              <span>CPU:</span>
              <span className="text-white">Quad-core 2GHz+</span>
            </li>
            <li className="aethel-flex aethel-justify-between">
              <span>Espaço:</span>
              <span className="text-white">1GB Livre</span>
            </li>
            <li className="aethel-flex aethel-justify-between">
              <span>Internet:</span>
              <span className="text-white">Conexão Estável</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
