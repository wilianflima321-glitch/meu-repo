'use client'

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'
import {
  Send,
  Bot,
  User,
  Sparkles,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Code,
  FileCode,
  Lightbulb,
  Bug,
  Zap,
  MessageSquare,
  Trash2,
  Settings,
  ChevronDown,
  Paperclip,
  Image,
  Mic,
  StopCircle,
} from 'lucide-react'

// ============= Types =============

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
  tokens?: number
  codeBlocks?: CodeBlock[]
}

interface CodeBlock {
  language: string
  code: string
  filename?: string
}

interface AIChatPanelProps {
  messages?: Message[]
  onSendMessage?: (message: string, context?: MessageContext) => void
  onRegenerateResponse?: (messageId: string) => void
  onRateResponse?: (messageId: string, rating: 'up' | 'down') => void
  onClearChat?: () => void
  currentModel?: string
  models?: ModelOption[]
  onModelChange?: (model: string) => void
  isLoading?: boolean
  streamingContent?: string
  className?: string
}

interface MessageContext {
  files?: string[]
  selection?: string
  image?: string
}

interface ModelOption {
  id: string
  name: string
  provider: string
  description?: string
  maxTokens?: number
}

// ============= Constants =============

const DEFAULT_MODELS: ModelOption[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most capable model', maxTokens: 128000 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast and efficient', maxTokens: 128000 },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'Anthropic', description: 'Balanced performance', maxTokens: 200000 },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', description: 'Multimodal', maxTokens: 1000000 },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', description: 'Budget-friendly', maxTokens: 32000 },
]

const QUICK_PROMPTS = [
  { icon: Code, label: 'Explain Code', prompt: 'Explain this code:' },
  { icon: Bug, label: 'Find Bugs', prompt: 'Find bugs in this code:' },
  { icon: Zap, label: 'Optimize', prompt: 'Optimize this code for performance:' },
  { icon: Lightbulb, label: 'Suggest', prompt: 'Suggest improvements for:' },
]

// ============= Demo Data =============

const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hello! I\'m your AI assistant. I can help you with:\n\n- **Code explanation** - Understand complex code\n- **Bug detection** - Find issues in your code\n- **Optimization** - Improve performance\n- **Code generation** - Write new code\n\nHow can I help you today?',
    timestamp: new Date(Date.now() - 60000),
    model: 'gpt-4o',
  },
]

// ============= Message Component =============

interface MessageBubbleProps {
  message: Message
  onCopy: (content: string) => void
  onRegenerate: () => void
  onRate: (rating: 'up' | 'down') => void
}

function MessageBubble({ message, onCopy, onRegenerate, onRate }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    onCopy(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Parse code blocks from content
  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g)
    
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/)
        if (match) {
          const [, language = 'text', code] = match
          return (
            <div key={i} className="my-3 rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700">
                <span className="text-xs text-slate-400">{language}</span>
                <button
                  onClick={() => onCopy(code)}
                  className="p-1 rounded hover:bg-slate-700 text-slate-400"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-sm">
                <code className="text-slate-300">{code}</code>
              </pre>
            </div>
          )
        }
      }
      
      // Render markdown-like formatting
      return (
        <span key={i} className="whitespace-pre-wrap">
          {part.split('\n').map((line, j) => (
            <span key={j}>
              {line.startsWith('- ') ? (
                <span className="block pl-4 before:content-['•'] before:absolute before:left-0 before:text-slate-500 relative">
                  {line.slice(2)}
                </span>
              ) : line.startsWith('**') && line.endsWith('**') ? (
                <strong>{line.slice(2, -2)}</strong>
              ) : (
                line
              )}
              {j < part.split('\n').length - 1 && <br />}
            </span>
          ))}
        </span>
      )
    })
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${isUser ? 'bg-indigo-600' : 'bg-gradient-to-br from-emerald-500 to-cyan-500'}
      `}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div className={`
          inline-block max-w-full text-left px-4 py-2.5 rounded-2xl
          ${isUser 
            ? 'bg-indigo-600 text-white rounded-tr-sm' 
            : 'bg-slate-800 text-slate-200 rounded-tl-sm'
          }
        `}>
          <div className="text-sm">{renderContent(message.content)}</div>
        </div>

        {/* Meta & Actions */}
        <div className={`flex items-center gap-2 mt-1 text-xs text-slate-500 ${isUser ? 'justify-end' : ''}`}>
          {message.model && (
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {message.model}
            </span>
          )}
          <span>{formatTime(message.timestamp)}</span>
          
          {!isUser && (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-slate-800"
                title="Copy"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onRegenerate}
                className="p-1 rounded hover:bg-slate-800"
                title="Regenerate"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onRate('up')}
                className="p-1 rounded hover:bg-slate-800"
                title="Good response"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onRate('down')}
                className="p-1 rounded hover:bg-slate-800"
                title="Bad response"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============= Main Component =============

export default function AIChatPanelPro({
  messages = DEMO_MESSAGES,
  onSendMessage,
  onRegenerateResponse,
  onRateResponse,
  onClearChat,
  currentModel = 'gpt-4o',
  models = DEFAULT_MODELS,
  onModelChange,
  isLoading = false,
  streamingContent = '',
  className = '',
}: AIChatPanelProps) {
  const [input, setInput] = useState('')
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  // Handle send
  const handleSend = useCallback((e?: FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return
    
    onSendMessage?.(input, {
      files: attachedFiles.length > 0 ? attachedFiles : undefined,
    })
    setInput('')
    setAttachedFiles([])
  }, [input, isLoading, attachedFiles, onSendMessage])

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle file attach
  const handleFileAttach = () => {
    fileInputRef.current?.click()
  }

  // Handle quick prompt
  const handleQuickPrompt = (prompt: string) => {
    setInput(prev => prev ? `${prev}\n\n${prompt}` : prompt)
    inputRef.current?.focus()
  }

  // Copy to clipboard
  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content)
  }

  const selectedModel = models.find(m => m.id === currentModel) || models[0]

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        {/* Model Selector */}
        <div className="relative">
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800 text-sm"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>{selectedModel.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showModelSelector && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowModelSelector(false)} />
              <div className="absolute left-0 top-full mt-1 z-50 min-w-64 py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                {models.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelChange?.(model.id)
                      setShowModelSelector(false)
                    }}
                    className={`
                      w-full flex items-start gap-3 px-3 py-2 text-left
                      ${model.id === currentModel ? 'bg-indigo-500/20' : 'hover:bg-slate-700'}
                    `}
                  >
                    <Sparkles className={`w-4 h-4 mt-0.5 ${model.id === currentModel ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{model.name}</span>
                        <span className="text-xs text-slate-500">{model.provider}</span>
                      </div>
                      {model.description && (
                        <span className="text-xs text-slate-400">{model.description}</span>
                      )}
                    </div>
                    {model.id === currentModel && <Check className="w-4 h-4 text-indigo-400" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onClearChat}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">AI Assistant</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              Ask me anything about your code. I can explain, debug, optimize, and generate code.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            onCopy={handleCopy}
            onRegenerate={() => onRegenerateResponse?.(message.id)}
            onRate={(rating) => onRateResponse?.(message.id, rating)}
          />
        ))}

        {/* Streaming response */}
        {streamingContent && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-block max-w-full text-left px-4 py-2.5 rounded-2xl rounded-tl-sm bg-slate-800 text-slate-200">
                <div className="text-sm whitespace-pre-wrap">{streamingContent}</div>
                <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-1" />
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !streamingContent && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div className="flex items-center gap-1 px-4 py-3 bg-slate-800 rounded-2xl rounded-tl-sm">
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts bar */}
      <div className="px-3 py-2 border-t border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
            <button
              key={label}
              onClick={() => handleQuickPrompt(prompt)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-full text-xs text-slate-300 whitespace-nowrap"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800">
        {/* Attached files */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedFiles.map(file => (
              <div key={file} className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                <FileCode className="w-3 h-3" />
                {file}
                <button
                  onClick={() => setAttachedFiles(prev => prev.filter(f => f !== file))}
                  className="p-0.5 hover:bg-slate-700 rounded"
                >
                  <MessageSquare className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Attach buttons */}
          <div className="flex items-center gap-1 pb-1">
            <button
              type="button"
              onClick={handleFileAttach}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400"
              title="Attach image"
            >
              <Image className="w-4 h-4" />
            </button>
          </div>

          {/* Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI..."
              disabled={isLoading}
              className="w-full px-4 py-2.5 pr-12 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none min-h-[44px] max-h-[200px]"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`
                absolute right-2 bottom-2 p-1.5 rounded-lg transition-colors
                ${input.trim() && !isLoading
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }
              `}
            >
              {isLoading ? (
                <StopCircle className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              setAttachedFiles(prev => [...prev, file.name])
            }
          }}
        />
      </form>
    </div>
  )
}

// ============= Helpers =============

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
