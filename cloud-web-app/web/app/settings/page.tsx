'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const SettingsEditor = dynamic(() => import('../../components/SettingsEditor'), { ssr: false })

// Icons
const SparklesIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
)

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const CreditCardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
)

const KeyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
)

type Tab = 'editor' | 'profile' | 'billing' | 'api'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('editor')

  const tabs = [
    { id: 'editor' as Tab, label: 'Editor', icon: SettingsIcon, description: 'Personalize sua experiência de edição' },
    { id: 'profile' as Tab, label: 'Perfil', icon: UserIcon, description: 'Gerencie suas informações pessoais' },
    { id: 'billing' as Tab, label: 'Faturamento', icon: CreditCardIcon, description: 'Planos e pagamentos' },
    { id: 'api' as Tab, label: 'API Keys', icon: KeyIcon, description: 'Gerencie suas chaves de API' },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/5 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ChevronLeftIcon />
              <span className="text-sm">Dashboard</span>
            </Link>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
                <SparklesIcon />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Configurações</h1>
                <p className="text-xs text-slate-500">Personalize o Aethel Engine</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="w-64 shrink-0">
            <div className="sticky top-24 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-violet-500/10 text-white border border-violet-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon />
                    <div>
                      <div className="font-medium text-sm">{tab.label}</div>
                      <div className="text-xs text-slate-500">{tab.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {activeTab === 'editor' && (
              <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <h2 className="text-xl font-semibold">Configurações do Editor</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Personalize fontes, tabulação, temas e comportamento do editor
                  </p>
                </div>
                <div className="p-6">
                  <SettingsEditor />
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                <h2 className="text-xl font-semibold mb-4">Perfil</h2>
                <p className="text-slate-400 mb-6">Gerencie suas informações pessoais e preferências.</p>
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition-colors"
                >
                  Ir para Perfil Completo
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                <h2 className="text-xl font-semibold mb-4">Faturamento</h2>
                <p className="text-slate-400 mb-6">Gerencie seu plano, pagamentos e faturas.</p>
                <Link
                  href="/billing"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition-colors"
                >
                  Ir para Faturamento
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                <h2 className="text-xl font-semibold mb-4">API Keys</h2>
                <p className="text-slate-400 mb-6">
                  Crie e gerencie chaves de API para integrar o Aethel com seus projetos.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5">
                    <div>
                      <div className="font-medium">Chave de Produção</div>
                      <div className="text-sm text-slate-500 font-mono">aethel_prod_••••••••••••</div>
                    </div>
                    <button className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                      Copiar
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5">
                    <div>
                      <div className="font-medium">Chave de Desenvolvimento</div>
                      <div className="text-sm text-slate-500 font-mono">aethel_dev_••••••••••••</div>
                    </div>
                    <button className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                      Copiar
                    </button>
                  </div>

                  <button className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition-colors">
                    + Criar Nova Chave
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
