'use client'

import { useState } from 'react'
import {
  Send,
  Sparkles,
  Brain,
  Wand2,
  Layers,
  Terminal,
  Loader2,
  Mic,
  Image as ImageIcon,
  Bug,
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  role: string
  icon: any
  color: string
  chipClass: string
}

const AGENTS: Agent[] = [
  {
    id: 'architect',
    name: 'Arquiteto Aethel',
    role: 'Visao e arquitetura',
    icon: Layers,
    color: 'text-[var(--aethel-primary-light)]',
    chipClass:
      'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] border border-[color-mix(in_srgb,var(--aethel-primary)_45%,transparent)] text-[var(--aethel-primary-light)] shadow-[0_0_16px_rgba(79,70,229,0.25)]',
  },
  {
    id: 'designer',
    name: 'Designer de UI/UX',
    role: 'Experiencia e interface',
    icon: Wand2,
    color: 'text-[var(--aethel-info-light)]',
    chipClass:
      'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] border border-[color-mix(in_srgb,var(--aethel-info)_45%,transparent)] text-[var(--aethel-info-light)] shadow-[0_0_16px_rgba(56,189,248,0.2)]',
  },
  {
    id: 'engineer',
    name: 'Engenheiro lider',
    role: 'Implementacao e performance',
    icon: Terminal,
    color: 'text-[var(--aethel-success-light)]',
    chipClass:
      'bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] border border-[color-mix(in_srgb,var(--aethel-success)_45%,transparent)] text-[var(--aethel-success-light)] shadow-[0_0_16px_rgba(16,185,129,0.2)]',
  },
  {
    id: 'qa',
    name: 'QA de IA',
    role: 'Qualidade e testes',
    icon: Bug,
    color: 'text-[var(--aethel-warning-light)]',
    chipClass:
      'bg-[color-mix(in_srgb,var(--aethel-warning)_18%,transparent)] border border-[color-mix(in_srgb,var(--aethel-warning)_45%,transparent)] text-[var(--aethel-warning-light)] shadow-[0_0_16px_rgba(251,191,36,0.2)]',
  },
]

export default function NexusChatMultimodal() {
  const [activeAgent, setActiveAgent] = useState<Agent>(AGENTS[0])
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [messages, setMessages] = useState<any[]>([])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const newMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInputValue('')
    setIsThinking(true)

    // Simulacao de resposta da IA
    setTimeout(() => {
      setIsThinking(false)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          agent: activeAgent,
          content: `Como seu ${activeAgent.role}, analisei sua solicitacao. Estou orquestrando as alteracoes no Nexus Canvas agora.`,
          thinking:
            'Analisando dependencias de arquitetura... Validando contra o AETHEL_DESIGN_MANIFESTO... Preparando execucao de codigo.',
          timestamp: new Date(),
        },
      ])
    }, 2000)
  }

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)] border-l border-[var(--aethel-border-primary)]">
      {/* Agent Selector */}
      <div className="flex items-center gap-2 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 overflow-x-auto no-scrollbar">
        {AGENTS.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setActiveAgent(agent)}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
              activeAgent.id === agent.id
                ? agent.chipClass
                : 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] border border-[var(--aethel-border-primary)] text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
            aria-pressed={activeAgent.id === agent.id}
            aria-label={`Selecionar agente ${agent.name}`}
          >
            <agent.icon
              size={14}
              className={activeAgent.id === agent.id ? agent.color : 'text-[var(--aethel-text-quaternary)]'}
            />
            <span>{agent.name}</span>
          </button>
        ))}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-[color-mix(in_srgb,var(--aethel-border-secondary)_85%,transparent)] scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)]">
              <Sparkles className="text-[var(--aethel-primary-light)]" />
            </div>
            <h3 className="mb-2 font-semibold text-[var(--aethel-text-primary)]">Bem-vindo ao Nexus Chat</h3>
            <p className="max-w-xs text-sm text-[var(--aethel-text-quaternary)]">
              Sua equipe de IAs especialistas esta pronta. Escolha um agente e comece.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-4 ${
                msg.role === 'user'
                  ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] shadow-lg shadow-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]'
                  : 'bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] text-[var(--aethel-text-primary)]'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="mb-2 flex items-center gap-2">
                  <msg.agent.icon size={12} className={msg.agent.color} />
                  <span className={`text-[10px] font-bold uppercase tracking-tighter ${msg.agent.color}`}>
                    {msg.agent.name}
                  </span>
                </div>
              )}
              <p className="text-sm leading-relaxed">{msg.content}</p>

              {msg.thinking && (
                <div className="mt-3 border-t border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] pt-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Brain size={12} className="text-[var(--aethel-info-light)]" />
                    <span className="text-[10px] font-bold uppercase text-[var(--aethel-info-light)]">
                      Raciocinio resumido
                    </span>
                  </div>
                  <p className="text-[11px] italic leading-tight text-[var(--aethel-text-quaternary)]">
                    {msg.thinking}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div
            className="flex w-fit items-center gap-3 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-4 py-2 animate-pulse"
            role="status"
            aria-live="polite"
          >
            <Loader2 size={14} className="animate-spin text-[var(--aethel-primary-light)]" />
            <span className="text-xs font-medium text-[var(--aethel-text-tertiary)]">
              O {activeAgent.name} esta em execucao...
            </span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 backdrop-blur-xl">
        <form onSubmit={handleSendMessage} className="relative group">
          <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-info)] blur opacity-20 transition duration-500 group-focus-within:opacity-50"></div>
          <div className="relative flex items-center rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-2 pl-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Fale com o ${activeAgent.name}...`}
              className="flex-1 bg-transparent py-2 text-sm text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] focus:outline-none"
              aria-label="Enviar mensagem para o agente ativo"
            />
            <div className="ml-2 flex items-center gap-1 border-l border-[var(--aethel-border-primary)] px-2">
              <button
                type="button"
                className="p-2 text-[var(--aethel-text-quaternary)] transition-colors hover:text-[var(--aethel-text-secondary)]"
                aria-label="Gravar audio"
              >
                <Mic size={18} />
              </button>
              <button
                type="button"
                className="p-2 text-[var(--aethel-text-quaternary)] transition-colors hover:text-[var(--aethel-text-secondary)]"
                aria-label="Enviar imagem"
              >
                <ImageIcon size={18} />
              </button>
              <button
                type="submit"
                className="ml-1 rounded-lg bg-[var(--aethel-primary)] p-2 text-[var(--aethel-text-primary)] shadow-lg shadow-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] transition-all hover:brightness-110"
                aria-label="Enviar mensagem"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </form>
        <div className="mt-2 flex justify-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--aethel-text-quaternary)]">
            Aethel Nexus Multimodal
          </p>
        </div>
      </div>
    </div>
  )
}
