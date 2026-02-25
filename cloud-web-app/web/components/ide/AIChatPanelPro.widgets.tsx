'use client'

import { useState } from 'react'
import NextImage from 'next/image'
import {
  Archive,
  Brain,
  CheckCircle,
  ChevronRight,
  Clock,
  File,
  FileCode,
  History,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  PhoneOff,
  Plus,
  Radio,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'

import { formatBytes, formatRelativeTime } from './AIChatPanelPro.format'
import type { Attachment, ChatThread, ToolCall } from './AIChatPanelPro.types'

// ============= Tool Call Component =============

export function ToolCallDisplay({ toolCall }: { toolCall: ToolCall }) {
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

export function ThinkingDisplay({ thinking, isExpanded, onToggle }: { thinking: string; isExpanded: boolean; onToggle: () => void }) {
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

export function LiveModeIndicator({ status, onEnd }: { status: 'idle' | 'listening' | 'thinking' | 'speaking'; onEnd: () => void }) {
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

export function ChatHistorySidebar({
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

export function AttachmentPreview({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }) {
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

