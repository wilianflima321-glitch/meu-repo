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
  ArrowRight,
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

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: generateSampleResponse(text),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
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
              <span className="text-slate-400 font-medium">AI Playground</span>
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

            {/* Info Box */}
            <div className="mt-12 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl max-w-md">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-400 mt-0.5" />
                <div className="text-left">
                  <p className="text-amber-200 text-sm font-medium mb-1">
                    Modo demonstração
                  </p>
                  <p className="text-amber-200/70 text-xs">
                    Esta é uma prévia do playground. Crie uma conta grátis para
                    acessar todas as funcionalidades da IA.
                  </p>
                </div>
              </div>
            </div>
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

      {/* CTA Banner */}
      <div className="border-t border-slate-800 bg-slate-900/50 py-6 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-white font-semibold mb-1">
              Gostou do que viu?
            </h3>
            <p className="text-slate-400 text-sm">
              Crie sua conta grátis e tenha acesso a todas as funcionalidades.
            </p>
          </div>
          <Link
            href="/register"
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Começar grátis
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// Helper function to generate sample responses
function generateSampleResponse(prompt: string): string {
  if (prompt.toLowerCase().includes('react') || prompt.toLowerCase().includes('login')) {
    return `Aqui está um componente React de login:

\`\`\`tsx
import { useState } from 'react'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Implementar lógica de login
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full px-4 py-2 rounded-lg"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
        className="w-full px-4 py-2 rounded-lg"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
\`\`\`

Quer que eu adicione validação ou integração com alguma API?`
  }

  if (prompt.toLowerCase().includes('landing') || prompt.toLowerCase().includes('page')) {
    return `Vou criar uma estrutura de landing page moderna:

**Seções recomendadas:**

1. **Hero Section**
   - Título impactante
   - Subtítulo explicativo
   - CTA principal
   - Imagem/ilustração

2. **Features/Benefícios**
   - 3-6 cards com ícones
   - Descrições concisas

3. **Social Proof**
   - Logos de clientes
   - Depoimentos

4. **Pricing**
   - 2-3 planos
   - Comparativo de features

5. **CTA Final**
   - Reforço da proposta de valor
   - Formulário de contato

Quer que eu gere o código completo de alguma dessas seções?`
  }

  if (prompt.toLowerCase().includes('api') || prompt.toLowerCase().includes('node')) {
    return `Aqui está uma estrutura básica de API REST em Node.js:

\`\`\`javascript
const express = require('express')
const app = express()

app.use(express.json())

// Middleware de logging
app.use((req, res, next) => {
  console.log(\`\${req.method} \${req.path}\`)
  next()
})

// Routes
app.get('/api/users', async (req, res) => {
  // Listar usuários
  res.json({ users: [] })
})

app.post('/api/users', async (req, res) => {
  // Criar usuário
  const { name, email } = req.body
  res.status(201).json({ id: 1, name, email })
})

app.get('/api/users/:id', async (req, res) => {
  // Buscar usuário por ID
  res.json({ id: req.params.id })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
})
\`\`\`

Quer que eu adicione autenticação JWT ou conexão com banco de dados?`
  }

  return `Entendi sua solicitação! Posso ajudar com:

• **Geração de código** - React, Node.js, Python, etc.
• **Explicações técnicas** - Conceitos e melhores práticas
• **Debugging** - Análise e correção de erros
• **Otimização** - Performance e boas práticas

Como posso ajudar especificamente? Dê mais detalhes sobre o que você precisa.`
}
