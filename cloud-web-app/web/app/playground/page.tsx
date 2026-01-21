'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Send,
  Code2,
  Image,
  FileText,
  Wand2,
  RefreshCw,
  Copy,
  Check,
  Bot,
  User,
  Lightbulb,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SAMPLE_PROMPTS = [
  { icon: Code2, text: 'Escreva um componente React de login' },
  { icon: Image, text: 'Gere uma landing page moderna' },
  { icon: FileText, text: 'Crie uma API REST em Node.js' },
  { icon: Wand2, text: 'Otimize este código para performance' },
]

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (prompt?: string) => {
    const text = prompt || input
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      setError(null)
      const payload = {
        model: 'gpt-4o-mini',
        messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const textResponse = await res.text()
      if (!res.ok) {
        const message = textResponse || 'Falha ao obter resposta da IA.'
        throw new Error(message)
      }

      let content = textResponse
      try {
        const data = JSON.parse(textResponse)
        content =
          data?.choices?.[0]?.message?.content ||
          data?.message?.content ||
          data?.content ||
          data?.output?.text ||
          textResponse
      } catch {
        // keep raw text
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: content || 'Sem resposta do modelo.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao chamar a IA')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleClear = () => {
    setMessages([])
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Aethel</span>
              </Link>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-medium">Playground de IA</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/register"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
              >
                Criar conta grátis
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-8">
        {messages.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mb-6">
              <Bot className="w-10 h-10 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Experimente a IA da Aethel
            </h1>
            <p className="text-slate-400 max-w-md mb-8">
              Teste nosso assistente de código alimentado por IA. Gere código,
              tire dúvidas e explore as possibilidades.
            </p>

            {/* Sample Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt.text}
                  onClick={() => handleSubmit(prompt.text)}
                  className="flex items-center gap-3 p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                    <prompt.icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <span className="text-slate-300 text-sm">{prompt.text}</span>
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl max-w-md">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-red-400 mt-0.5" />
                  <div className="text-left">
                    <p className="text-red-200 text-sm font-medium mb-1">
                      Falha ao conectar com a IA
                    </p>
                    <p className="text-red-200/70 text-xs">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Chat Messages */
          <div className="flex-1 overflow-y-auto space-y-6 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </div>
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700">
                      <button
                        onClick={() => handleCopy(message.id, message.content)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-800 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="sticky bottom-0 pt-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
          {messages.length > 0 && (
            <div className="flex justify-center mb-4">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Nova conversa
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
            className="relative"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={isLoading}
              className="w-full px-5 py-4 pr-14 bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl text-white placeholder-slate-500 outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
          <p className="text-center text-xs text-slate-500 mt-3">
            A IA pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </main>
    </div>
  )
}
