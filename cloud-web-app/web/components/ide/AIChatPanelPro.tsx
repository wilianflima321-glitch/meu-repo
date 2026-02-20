'use client'

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'
import NextImage from 'next/image'
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
  MicOff,
  StopCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  History,
  Clock,
  Wand2,
  Brain,
  Layers,
  Terminal,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Radio,
  Phone,
  PhoneOff,
  MessageCircle,
  Plus,
  MoreHorizontal,
  Archive,
  Search,
  X,
  Upload,
  File,
  ImageIcon,
} from 'lucide-react'

import { DEFAULT_MODELS, DEMO_MESSAGES } from './AIChatPanelPro.types'
import { formatBytes, formatRelativeTime, formatTime } from './AIChatPanelPro.format'
import type {
  AIChatPanelProps,
  Attachment,
  ChatThread,
  Message,
  MessageContext,
  SpeechRecognitionEventExtended,
  SpeechRecognitionInstance,
  ToolCall,
} from './AIChatPanelPro.types'

const QUICK_PROMPTS = [
  { icon: Code, label: 'Explain Code', prompt: 'Explain this code:' },
  { icon: Bug, label: 'Find Bugs', prompt: 'Find bugs in this code:' },
  { icon: Zap, label: 'Optimize', prompt: 'Optimize this code for performance:' },
  { icon: Lightbulb, label: 'Suggest', prompt: 'Suggest improvements for:' },
  { icon: Terminal, label: 'Generate', prompt: 'Generate code for:' },
  { icon: Wand2, label: 'Refactor', prompt: 'Refactor this code:' },
  { icon: Brain, label: 'Explain Error', prompt: 'Explain this error and how to fix it:' },
  { icon: Layers, label: 'Add Tests', prompt: 'Generate unit tests for:' },
]

// ============= Tool Call Component =============

function ToolCallDisplay({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false)
  
  const statusIcon = {
    pending: <Clock className="w-3.5 h-3.5 text-slate-400" />,
    running: <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
    completed: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
    failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  }

  const statusColor = {
    pending: 'border-slate-600',
    running: 'border-blue-500 bg-blue-500/5',
    completed: 'border-emerald-500/50 bg-emerald-500/5',
    failed: 'border-red-500/50 bg-red-500/5',
  }

  return (
    <div className={`rounded-lg border ${statusColor[toolCall.status]} overflow-hidden my-2`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5"
      >
        {statusIcon[toolCall.status]}
        <span className="flex-1 text-sm font-mono text-slate-300">{toolCall.name}</span>
        {toolCall.duration && (
          <span className="text-xs text-slate-500">{toolCall.duration}ms</span>
        )}
        <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      
      {expanded && (
        <div className="px-3 py-2 border-t border-slate-700/50 bg-slate-900/50">
          {toolCall.args && (
            <div className="mb-2">
              <span className="text-xs text-slate-500">Arguments:</span>
              <pre className="mt-1 text-xs text-slate-400 overflow-x-auto">
                {JSON.stringify(toolCall.args, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.result && (
            <div>
              <span className="text-xs text-slate-500">Result:</span>
              <pre className="mt-1 text-xs text-slate-400 overflow-x-auto max-h-32">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============= Thinking Display Component =============

function ThinkingDisplay({ thinking, isExpanded, onToggle }: { thinking: string; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="my-2 rounded-lg border border-cyan-500/30 bg-cyan-500/5 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5"
      >
        <Brain className="w-3.5 h-3.5 text-cyan-400" />
        <span className="flex-1 text-sm text-cyan-300">Thinking...</span>
        <ChevronRight className={`w-4 h-4 text-cyan-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>
      
      {isExpanded && (
        <div className="px-3 py-2 border-t border-cyan-500/20 bg-cyan-900/20">
          <p className="text-sm text-cyan-200/80 whitespace-pre-wrap">{thinking}</p>
        </div>
      )}
    </div>
  )
}

// ============= Live Mode Indicator =============

function LiveModeIndicator({ status, onEnd }: { status: 'idle' | 'listening' | 'thinking' | 'speaking'; onEnd: () => void }) {
  const statusConfig = {
    idle: { color: 'bg-slate-500', pulse: false, text: 'Ready' },
    listening: { color: 'bg-red-500', pulse: true, text: 'Listening...' },
    thinking: { color: 'bg-amber-500', pulse: true, text: 'Thinking...' },
    speaking: { color: 'bg-emerald-500', pulse: true, text: 'Speaking...' },
  }
  
  const config = statusConfig[status]
  
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-900/50 to-cyan-900/50 border-b border-blue-500/30">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
        {config.pulse && (
          <div className={`absolute inset-0 w-3 h-3 rounded-full ${config.color} animate-ping opacity-75`} />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Live Mode</span>
        </div>
        <span className="text-xs text-slate-400">{config.text}</span>
      </div>
      <button
        onClick={onEnd}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-full text-red-400 text-sm"
      >
        <PhoneOff className="w-3.5 h-3.5" />
        End
      </button>
    </div>
  )
}

// ============= Chat History Sidebar =============

function ChatHistorySidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onCreateThread,
  onArchiveThread,
  onDeleteThread,
  onClose,
}: {
  threads: ChatThread[]
  activeThreadId?: string
  onSelectThread: (id: string) => void
  onCreateThread: () => void
  onArchiveThread: (id: string) => void
  onDeleteThread: (id: string) => void
  onClose: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const filteredThreads = threads.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const activeThreads = filteredThreads.filter(t => !t.isArchived)
  const archivedThreads = filteredThreads.filter(t => t.isArchived)

  return (
    <div className="w-72 h-full flex flex-col border-r border-slate-700 bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-white">Chat History</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
      
      {/* Search & New Chat */}
      <div className="p-2 space-y-2 border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={onCreateThread}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>
      
      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {activeThreads.length > 0 && (
          <div className="p-2">
            {activeThreads.map(thread => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isActive={thread.id === activeThreadId}
                onSelect={() => onSelectThread(thread.id)}
                onArchive={() => onArchiveThread(thread.id)}
                onDelete={() => onDeleteThread(thread.id)}
              />
            ))}
          </div>
        )}
        
        {archivedThreads.length > 0 && (
          <div className="p-2 border-t border-slate-800">
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-500">
              <Archive className="w-3 h-3" />
              Archived
            </div>
            {archivedThreads.map(thread => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isActive={thread.id === activeThreadId}
                onSelect={() => onSelectThread(thread.id)}
                onArchive={() => onArchiveThread(thread.id)}
                onDelete={() => onDeleteThread(thread.id)}
              />
            ))}
          </div>
        )}
        
        {filteredThreads.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageCircle className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">No conversations found</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ThreadItem({
  thread,
  isActive,
  onSelect,
  onArchive,
  onDelete,
}: {
  thread: ChatThread
  isActive: boolean
  onSelect: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  
  return (
    <div
      className={`group relative rounded-lg cursor-pointer mb-1 ${
        isActive ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-slate-800'
      }`}
    >
      <button onClick={onSelect} className="w-full text-left p-2.5">
        <div className="font-medium text-sm text-white truncate">{thread.title}</div>
        <div className="text-xs text-slate-400 truncate mt-0.5">{thread.lastMessage}</div>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(thread.updatedAt)}
          <span>·</span>
          <span>{thread.messageCount} msgs</span>
        </div>
      </button>
      
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
          className="p-1 hover:bg-slate-700 rounded"
        >
          <MoreHorizontal className="w-4 h-4 text-slate-400" />
        </button>
        
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 w-32 py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
              <button
                onClick={() => { onArchive(); setShowMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-700"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive
              </button>
              <button
                onClick={() => { onDelete(); setShowMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-red-400 hover:bg-slate-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============= Attachment Preview =============

function AttachmentPreview({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  return (
    <div className="relative group">
      {attachment.type === 'image' && attachment.preview ? (
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
          <NextImage
            src={attachment.preview}
            alt={attachment.name}
            width={64}
            height={64}
            unoptimized
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg">
          {attachment.type === 'code' ? (
            <FileCode className="w-4 h-4 text-blue-400" />
          ) : (
            <File className="w-4 h-4 text-slate-400" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white truncate max-w-24">{attachment.name}</div>
            {attachment.size && (
              <div className="text-xs text-slate-500">{formatBytes(attachment.size)}</div>
            )}
          </div>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3 text-white" />
      </button>
    </div>
  )
}

// ============= Voice Recording Hook =============

function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const startRecording = useCallback(async () => {
    try {
      // Try Web Speech API first for real-time transcription
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognitionAPI() as SpeechRecognitionInstance
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'pt-BR'
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEventExtended) => {
          let interimTranscript = ''
          let finalTranscript = ''
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              finalTranscript += result[0].transcript
            } else {
              interimTranscript += result[0].transcript
            }
          }
          
          setTranscript(finalTranscript || interimTranscript)
        }
        
        recognitionRef.current.start()
      }

      // Also record audio for potential server-side transcription
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      chunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [isRecording])

  const clearRecording = useCallback(() => {
    setAudioBlob(null)
    setTranscript('')
  }, [])

  return {
    isRecording,
    audioBlob,
    transcript,
    isTranscribing,
    startRecording,
    stopRecording,
    clearRecording,
  }
}

// ============= Demo Data =============

// ============= Message Component =============

interface MessageBubbleProps {
  message: Message
  onCopy: (content: string) => void
  onRegenerate: () => void
  onRate: (rating: 'up' | 'down') => void
}

function MessageBubble({ message, onCopy, onRegenerate, onRate }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [showThinking, setShowThinking] = useState(false)
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
        ${isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-emerald-500 to-cyan-500'}
      `}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        {/* Voice indicator */}
        {message.isVoice && (
          <div className="flex items-center gap-1 mb-1 text-xs text-blue-400">
            <Mic className="w-3 h-3" />
            Voice message
          </div>
        )}
        
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map(att => (
              <div key={att.id} className="flex items-center gap-2 px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">
                {att.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <File className="w-3 h-3" />}
                {att.name}
              </div>
            ))}
          </div>
        )}
        
        {/* Thinking display */}
        {message.thinking && (
          <ThinkingDisplay
            thinking={message.thinking}
            isExpanded={showThinking}
            onToggle={() => setShowThinking(!showThinking)}
          />
        )}
        
        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2">
            {message.toolCalls.map(tc => (
              <ToolCallDisplay key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        <div className={`
          inline-block max-w-full text-left px-4 py-2.5 rounded-2xl
          ${isUser 
            ? 'bg-blue-600 text-white rounded-tr-sm' 
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
          {message.tokens && (
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {message.tokens} tokens
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
  // New props
  threads = [],
  activeThreadId,
  onSelectThread,
  onCreateThread,
  onArchiveThread,
  onDeleteThread,
  showHistory = false,
  onToggleHistory,
  isLiveMode = false,
  onToggleLiveMode,
  liveStatus = 'idle',
  allowAttachments = false,
}: AIChatPanelProps) {
  const [input, setInput] = useState('')
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showHistorySidebar, setShowHistorySidebar] = useState(showHistory)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  
  // Voice recording
  const { isRecording, transcript, startRecording, stopRecording, clearRecording } = useVoiceRecording()
  
  // Text-to-speech
  const [isSpeaking, setIsSpeaking] = useState(false)
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null)

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
  
  // Update input with transcript
  useEffect(() => {
    if (transcript) {
      setInput(prev => prev + ' ' + transcript)
    }
  }, [transcript])
  
  // Speak last assistant message
  const speakMessage = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      speechSynthRef.current = new SpeechSynthesisUtterance(text)
      speechSynthRef.current.lang = 'pt-BR'
      speechSynthRef.current.onend = () => setIsSpeaking(false)
      speechSynthRef.current.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(speechSynthRef.current)
      setIsSpeaking(true)
    }
  }, [])
  
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  // Handle send
  const handleSend = useCallback((e?: FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return
    
    onSendMessage?.(input, {
      attachments: allowAttachments && attachments.length > 0 ? attachments : undefined,
    })
    setInput('')
    setAttachments([])
    clearRecording()
  }, [input, isLoading, attachments, onSendMessage, clearRecording, allowAttachments])

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
  
  // Handle image attach
  const handleImageAttach = () => {
    imageInputRef.current?.click()
  }
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const file = e.target.files?.[0]
    if (file) {
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        type,
        name: file.name,
        size: file.size,
      }
      
      if (type === 'image') {
        const reader = new FileReader()
        reader.onload = (ev) => {
          attachment.preview = ev.target?.result as string
          setAttachments(prev => [...prev, attachment])
        }
        reader.readAsDataURL(file)
      } else {
        setAttachments(prev => [...prev, attachment])
      }
    }
    e.target.value = ''
  }
  
  // Remove attachment
  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
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
  
  // Toggle voice recording
  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const selectedModel = models.find(m => m.id === currentModel) || models[0]

  return (
    <div className={`h-full flex ${className}`}>
      {/* History Sidebar */}
      {showHistorySidebar && threads.length > 0 && onSelectThread && onCreateThread && onArchiveThread && onDeleteThread && (
        <ChatHistorySidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={onSelectThread}
          onCreateThread={onCreateThread}
          onArchiveThread={onArchiveThread}
          onDeleteThread={onDeleteThread}
          onClose={() => setShowHistorySidebar(false)}
        />
      )}
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Live Mode Indicator */}
        {isLiveMode && onToggleLiveMode && (
          <LiveModeIndicator status={liveStatus} onEnd={onToggleLiveMode} />
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
          {/* Left: History + Model */}
          <div className="flex items-center gap-2">
            {threads.length > 0 && (
              <button
                onClick={() => setShowHistorySidebar(!showHistorySidebar)}
                className={`p-1.5 rounded hover:bg-slate-800 ${showHistorySidebar ? 'bg-slate-800 text-blue-400' : 'text-slate-400'}`}
                title="Chat History"
              >
                <History className="w-4 h-4" />
              </button>
            )}
            
            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800 text-sm"
              >
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>{selectedModel.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showModelSelector && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowModelSelector(false)} />
                  <div className="absolute left-0 top-full mt-1 z-50 min-w-72 py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                    {models.map(model => (
                      <button
                        key={model.id}
                        onClick={() => {
                          onModelChange?.(model.id)
                          setShowModelSelector(false)
                        }}
                        className={`
                          w-full flex items-start gap-3 px-3 py-2 text-left
                          ${model.id === currentModel ? 'bg-blue-500/20' : 'hover:bg-slate-700'}
                        `}
                      >
                        <Sparkles className={`w-4 h-4 mt-0.5 ${model.id === currentModel ? 'text-blue-400' : 'text-slate-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-white">{model.name}</span>
                            <span className="text-xs text-slate-500">{model.provider}</span>
                            {model.supportsVision && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-400 rounded">Vision</span>
                            )}
                            {model.supportsVoice && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 rounded">Voice</span>
                            )}
                          </div>
                          {model.description && (
                            <span className="text-xs text-slate-400">{model.description}</span>
                          )}
                        </div>
                        {model.id === currentModel && <Check className="w-4 h-4 text-blue-400" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Live Mode Toggle */}
            {selectedModel.supportsVoice && onToggleLiveMode && (
              <button
                onClick={onToggleLiveMode}
                className={`p-1.5 rounded ${isLiveMode ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                title={isLiveMode ? 'Exit Live Mode' : 'Enter Live Mode (Gemini Live style)'}
              >
                <Radio className="w-4 h-4" />
              </button>
            )}
            
            {/* TTS Toggle */}
            <button
              onClick={isSpeaking ? stopSpeaking : () => {
                const lastAssistantMsg = messages.filter(m => m.role === 'assistant').pop()
                if (lastAssistantMsg) speakMessage(lastAssistantMsg.content)
              }}
              className={`p-1.5 rounded ${isSpeaking ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
              title={isSpeaking ? 'Stop speaking' : 'Read last response'}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            
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
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Assistant</h3>
              <p className="text-sm text-slate-400 max-w-sm mb-6">
                Ask me anything about your code. I can explain, debug, optimize, and generate code.
              </p>
              {selectedModel.supportsVoice && (
                <p className="text-xs text-blue-400 mb-4 flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  This model supports Live Mode for real-time voice chat
                </p>
              )}
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
                <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />
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
        {/* Attachments preview */}
        {allowAttachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map(att => (
              <AttachmentPreview
                key={att.id}
                attachment={att}
                onRemove={() => removeAttachment(att.id)}
              />
            ))}
          </div>
        )}
        
        {/* Voice recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="flex-1 text-sm text-red-400">Recording... {transcript && `"${transcript}"`}</span>
            <button
              type="button"
              onClick={stopRecording}
              className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs text-red-400"
            >
              Stop
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Attach buttons */}
          <div className="flex items-center gap-1 pb-1">
            {allowAttachments && (
              <button
                type="button"
                onClick={handleFileAttach}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            )}
            {allowAttachments && selectedModel.supportsVision && (
              <button
                type="button"
                onClick={handleImageAttach}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400"
                title="Attach image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`p-1.5 rounded ${isRecording ? 'bg-red-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? 'Listening...' : 'Ask AI...'}
              disabled={isLoading}
              className="w-full px-4 py-2.5 pr-12 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none min-h-[44px] max-h-[200px]"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`
                absolute right-2 bottom-2 p-1.5 rounded-lg transition-colors
                ${input.trim() && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
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

        {/* Hidden file inputs */}
        {allowAttachments && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".ts,.tsx,.js,.jsx,.json,.md,.txt,.py,.css,.html"
              onChange={(e) => handleFileSelect(e, 'file')}
            />
            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, 'image')}
            />
          </>
        )}
      </form>
      </div>
    </div>
  )
}
