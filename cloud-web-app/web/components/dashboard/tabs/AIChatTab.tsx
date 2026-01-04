'use client'

import { useState, useRef, useEffect, type FormEvent } from 'react'
import {
  Send,
  Sparkles,
  Code,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  History,
  Plus,
  Trash2,
  Bot,
  User,
  StopCircle,
  Loader2,
} from 'lucide-react'
import { Card, Button, EmptyChat, Dropdown, type DropdownItem } from '../../ui'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
}

export interface ChatThread {
  id: string
  title: string
  lastMessage?: string
  updatedAt: Date
}

interface AIChatTabProps {
  messages?: ChatMessage[]
  threads?: ChatThread[]
  currentThreadId?: string | null
  isGenerating?: boolean
  onSendMessage?: (message: string) => void
  onStopGeneration?: () => void
  onNewThread?: () => void
  onSwitchThread?: (threadId: string) => void
  onDeleteThread?: (threadId: string) => void
}

function MessageBubble({
  message,
  onCopy,
}: {
  message: ChatMessage
  onCopy?: (content: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    onCopy?.(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
          ${isUser ? 'bg-indigo-600' : 'bg-gradient-to-br from-purple-500 to-pink-500'}
        `}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`
            inline-block p-4 rounded-2xl
            ${isUser
              ? 'bg-indigo-600 text-white rounded-tr-none'
              : 'bg-slate-800 text-slate-100 rounded-tl-none'
            }
          `}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        
        {/* Actions */}
        <div
          className={`
            flex items-center gap-2 mt-2 text-xs text-slate-500
            ${isUser ? 'justify-end' : 'justify-start'}
          `}
        >
          <span>
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {!isUser && (
            <>
              <span>•</span>
              <button
                onClick={handleCopy}
                className="hover:text-slate-300 transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-slate-800 rounded-2xl rounded-tl-none px-4 py-3">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

export function AIChatTab({
  messages = [],
  threads = [],
  currentThreadId,
  isGenerating = false,
  onSendMessage,
  onStopGeneration,
  onNewThread,
  onSwitchThread,
  onDeleteThread,
}: AIChatTabProps) {
  const [inputValue, setInputValue] = useState('')
  const [showThreads, setShowThreads] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGenerating])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`
    }
  }, [inputValue])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isGenerating) return
    onSendMessage?.(inputValue.trim())
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const threadMenuItems: DropdownItem[] = threads.map((thread) => ({
    id: thread.id,
    label: thread.title,
    onClick: () => onSwitchThread?.(thread.id),
  }))

  const currentThread = threads.find((t) => t.id === currentThreadId)

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-white">AI Chat</h1>
            <p className="text-sm text-slate-400">
              {currentThread?.title || 'Nova conversa'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Dropdown
            trigger={
              <Button variant="ghost" size="sm">
                <History className="w-4 h-4 mr-2" />
                Histórico
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            }
            items={threadMenuItems}
            align="right"
            width="lg"
          />
          <Button variant="secondary" size="sm" onClick={onNewThread}>
            <Plus className="w-4 h-4 mr-2" />
            Nova
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.length === 0 ? (
          <EmptyChat onStart={() => inputRef.current?.focus()} />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCopy={handleCopy}
              />
            ))}
            {isGenerating && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="pt-4 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
            className="w-full px-4 py-3 pr-24 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
            rows={1}
            disabled={isGenerating}
          />
          
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            {isGenerating ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={onStopGeneration}
              >
                <StopCircle className="w-4 h-4 mr-1" />
                Parar
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                disabled={!inputValue.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </form>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-slate-500">Sugestões:</span>
          <button
            onClick={() => setInputValue('Explique este código: ')}
            className="px-3 py-1 text-xs text-slate-400 bg-slate-800/50 hover:bg-slate-800 rounded-full transition-colors"
          >
            <Code className="w-3 h-3 inline mr-1" />
            Explicar código
          </button>
          <button
            onClick={() => setInputValue('Refatore este código para: ')}
            className="px-3 py-1 text-xs text-slate-400 bg-slate-800/50 hover:bg-slate-800 rounded-full transition-colors"
          >
            <RefreshCw className="w-3 h-3 inline mr-1" />
            Refatorar
          </button>
          <button
            onClick={() => setInputValue('Crie um teste para: ')}
            className="px-3 py-1 text-xs text-slate-400 bg-slate-800/50 hover:bg-slate-800 rounded-full transition-colors"
          >
            <Sparkles className="w-3 h-3 inline mr-1" />
            Criar teste
          </button>
        </div>
      </div>
    </div>
  )
}

export default AIChatTab
