'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Send, Bot, User, Sparkles, Brain, Wand2, Layers, Terminal, 
  ChevronRight, Loader2, CheckCircle, XCircle, Mic, Image as ImageIcon,
  MoreHorizontal, Plus, Search, Archive, Trash2, Settings, Code, Bug, Lightbulb, Zap
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  role: string
  icon: any
  color: string
}

const AGENTS: Agent[] = [
  { id: 'architect', name: 'Aethel Architect', role: 'System Design & Vision', icon: Layers, color: 'text-blue-400' },
  { id: 'designer', name: 'UI/UX Designer', role: 'Aesthetic & Usability', icon: Wand2, color: 'text-pink-400' },
  { id: 'engineer', name: 'Lead Engineer', role: 'Performance & Implementation', icon: Terminal, color: 'text-emerald-400' },
  { id: 'qa', name: 'QA Analyst', role: 'Quality & Testing', icon: Bug, color: 'text-amber-400' }
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
      timestamp: new Date()
    }

    setMessages([...messages, newMessage])
    setInputValue('')
    setIsThinking(true)

    // Simulação de resposta da IA
    setTimeout(() => {
      setIsThinking(false)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        agent: activeAgent,
        content: `Como seu ${activeAgent.role}, analisei sua solicitação. Estou orquestrando as alterações no Nexus Canvas agora.`,
        thinking: 'Analisando dependências de arquitetura... Validando contra o AETHEL_DESIGN_MANIFESTO... Preparando execução de código.',
        timestamp: new Date()
      }])
    }, 2000)
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">
      {/* Agent Selector */}
      <div className="flex items-center gap-2 p-4 border-b border-zinc-800 bg-zinc-900/30 overflow-x-auto no-scrollbar">
        {AGENTS.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setActiveAgent(agent)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
              activeAgent.id === agent.id 
                ? 'bg-blue-600/20 border border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <agent.icon size={14} className={activeAgent.id === agent.id ? agent.color : ''} />
            <span>{agent.name}</span>
          </button>
        ))}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30">
              <Sparkles className="text-blue-400" />
            </div>
            <h3 className="text-zinc-100 font-semibold mb-2">Bem-vindo ao Nexus Chat</h3>
            <p className="text-zinc-500 text-sm max-w-xs">
              Sua equipe de IAs especialistas está pronta para construir o futuro. Escolha um agente e comece.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-100'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <msg.agent.icon size={12} className={msg.agent.color} />
                  <span className={`text-[10px] font-bold uppercase tracking-tighter ${msg.agent.color}`}>
                    {msg.agent.name}
                  </span>
                </div>
              )}
              <p className="text-sm leading-relaxed">{msg.content}</p>
              
              {msg.thinking && (
                <div className="mt-3 pt-3 border-t border-zinc-800/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain size={12} className="text-cyan-400" />
                    <span className="text-[10px] font-bold text-cyan-500 uppercase">Processo de Pensamento</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 italic leading-tight">{msg.thinking}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl w-fit animate-pulse">
            <Loader2 size={14} className="text-blue-500 animate-spin" />
            <span className="text-xs text-zinc-400 font-medium">O {activeAgent.name} está arquitetando...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 backdrop-blur-xl">
        <form onSubmit={handleSendMessage} className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-20 group-focus-within:opacity-50 transition duration-500"></div>
          <div className="relative flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-2 pl-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Fale com o ${activeAgent.name}...`}
              className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none py-2"
            />
            <div className="flex items-center gap-1 px-2 border-l border-zinc-800 ml-2">
              <button type="button" className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"><Mic size={18} /></button>
              <button type="button" className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"><ImageIcon size={18} /></button>
              <button type="submit" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40 ml-1">
                <Send size={18} />
              </button>
            </div>
          </div>
        </form>
        <div className="mt-2 flex justify-center">
          <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Aethel Engine Multimodal Suite</p>
        </div>
      </div>
    </div>
  )
}
