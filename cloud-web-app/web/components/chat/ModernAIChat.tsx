'use client';

/**
 * ModernAIChat - Chat de IA estilo GitHub Copilot / Gemini
 * Design profissional AAA com todas as funcionalidades modernas
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Code2,
  FileCode,
  Lightbulb,
  Bug,
  Zap,
  Trash2,
  ChevronDown,
  Paperclip,
  Image as ImageIcon,
  Mic,
  MicOff,
  StopCircle,
  History,
  Clock,
  Wand2,
  Brain,
  Terminal,
  Loader2,
  CheckCircle,
  XCircle,
  Plus,
  MoreHorizontal,
  Search,
  X,
  ArrowUp,
  Globe,
  Cpu,
  Eye,
  MessageSquare,
  ChevronRight,
  Play,
  Settings,
  Bot,
  User,
  Maximize2,
  Minimize2,
  PanelRightClose,
  Layers,
} from 'lucide-react';

// ============= Types =============

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  isStreaming?: boolean;
  codeBlocks?: CodeBlock[];
  thinking?: ThinkingStep[];
  sources?: Source[];
  actions?: ActionButton[];
}

interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

interface ThinkingStep {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'running' | 'completed';
  duration?: number;
}

interface Source {
  title: string;
  url?: string;
  snippet?: string;
}

interface ActionButton {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
}

interface ChatThread {
  id: string;
  title: string;
  preview: string;
  updatedAt: Date;
  messageCount: number;
}

interface ModernAIChatProps {
  className?: string;
  onSendMessage?: (message: string) => Promise<void>;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  showPreview?: boolean;
  onTogglePreview?: () => void;
}

// ============= Model Selector =============

const MODELS = [
  { id: 'aethel-pro', name: 'Aethel Pro', icon: Sparkles, description: 'Modelo principal otimizado para game dev', color: 'from-purple-500 to-cyan-500' },
  { id: 'gpt-4o', name: 'GPT-4o', icon: Globe, description: 'OpenAI mais avançado', color: 'from-emerald-500 to-teal-500' },
  { id: 'claude-sonnet', name: 'Claude Sonnet', icon: Brain, description: 'Anthropic balanceado', color: 'from-orange-500 to-amber-500' },
  { id: 'gemini-2', name: 'Gemini 2.0', icon: Cpu, description: 'Google multimodal', color: 'from-blue-500 to-indigo-500' },
];

function ModelSelector({ selectedModel, onSelect }: { selectedModel: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const model = MODELS.find(m => m.id === selectedModel) || MODELS[0];
  const Icon = model.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
      >
        <div className={`w-5 h-5 rounded bg-gradient-to-br ${model.color} flex items-center justify-center`}>
          <Icon className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm text-white font-medium">{model.name}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full left-0 mt-2 z-50 w-64 rounded-xl bg-gray-900 border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
            >
              <div className="p-2">
                {MODELS.map((m) => {
                  const MIcon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => { onSelect(m.id); setOpen(false); }}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all ${
                        m.id === selectedModel ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center flex-shrink-0`}>
                        <MIcon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-white">{m.name}</div>
                        <div className="text-xs text-gray-400">{m.description}</div>
                      </div>
                      {m.id === selectedModel && (
                        <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============= Quick Actions =============

const QUICK_ACTIONS = [
  { id: 'explain', icon: Lightbulb, label: 'Explicar código', color: 'text-yellow-400' },
  { id: 'fix', icon: Bug, label: 'Corrigir bug', color: 'text-red-400' },
  { id: 'optimize', icon: Zap, label: 'Otimizar', color: 'text-green-400' },
  { id: 'generate', icon: Code2, label: 'Gerar código', color: 'text-blue-400' },
  { id: 'refactor', icon: Wand2, label: 'Refatorar', color: 'text-purple-400' },
  { id: 'test', icon: Play, label: 'Criar testes', color: 'text-cyan-400' },
];

// ============= Message Bubble =============

function MessageBubble({ message, isLast }: { message: Message; isLast: boolean }) {
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const isUser = message.role === 'user';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser 
          ? 'bg-gradient-to-br from-cyan-500 to-blue-600' 
          : 'bg-gradient-to-br from-purple-500 to-pink-600'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-sm font-medium text-white">
            {isUser ? 'Você' : 'Aethel AI'}
          </span>
          <span className="text-xs text-gray-500">
            {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {message.model && !isUser && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
              {message.model}
            </span>
          )}
        </div>

        {/* Thinking Steps (Gemini-style) */}
        {message.thinking && message.thinking.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Brain className="w-4 h-4" />
              <span>Pensamento ({message.thinking.length} etapas)</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${showThinking ? 'rotate-90' : ''}`} />
            </button>
            
            <AnimatePresence>
              {showThinking && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-2 border-l-2 border-purple-500/30 pl-4"
                >
                  {message.thinking.map((step, i) => (
                    <div key={step.id} className="text-sm">
                      <div className="flex items-center gap-2 text-purple-300">
                        {step.status === 'completed' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        ) : step.status === 'running' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                        )}
                        <span className="font-medium">{step.title}</span>
                        {step.duration && (
                          <span className="text-xs text-gray-500">{step.duration}ms</span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mt-1 ml-5">{step.content}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Message Content */}
        <div className={`rounded-2xl px-4 py-3 ${
          isUser 
            ? 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white' 
            : 'bg-gray-800/80 text-gray-100 border border-white/5'
        }`}>
          {message.isStreaming ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-gray-400">Gerando resposta...</span>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              {message.content.split('\n').map((line, i) => (
                <p key={i} className="mb-2 last:mb-0">{line}</p>
              ))}
            </div>
          )}

          {/* Code Blocks */}
          {message.codeBlocks && message.codeBlocks.length > 0 && (
            <div className="mt-3 space-y-3">
              {message.codeBlocks.map((block, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-white/10">
                  <div className="flex items-center justify-between px-3 py-2 bg-black/30">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-gray-400">{block.filename || block.language}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(block.code)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <pre className="p-3 bg-black/50 overflow-x-auto">
                    <code className="text-sm text-gray-300 font-mono">{block.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* Sources (Gemini-style) */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                <Globe className="w-3.5 h-3.5" />
                <span>Fontes</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {message.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-cyan-400 transition-colors"
                  >
                    <Globe className="w-3 h-3" />
                    {source.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-1 mt-2">
            <button className="p-1.5 hover:bg-white/5 rounded-lg transition-colors group">
              <Copy className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
            </button>
            <button className="p-1.5 hover:bg-white/5 rounded-lg transition-colors group">
              <ThumbsUp className="w-4 h-4 text-gray-500 group-hover:text-green-400" />
            </button>
            <button className="p-1.5 hover:bg-white/5 rounded-lg transition-colors group">
              <ThumbsDown className="w-4 h-4 text-gray-500 group-hover:text-red-400" />
            </button>
            <button className="p-1.5 hover:bg-white/5 rounded-lg transition-colors group">
              <RefreshCw className="w-4 h-4 text-gray-500 group-hover:text-cyan-400" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============= Empty State =============

function EmptyState({ onQuickAction }: { onQuickAction: (action: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-purple-500/20">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Olá! Sou o Aethel AI</h2>
        <p className="text-gray-400 max-w-md">
          Assistente inteligente para desenvolvimento de jogos. Posso ajudar com código, blueprints, shaders, level design e muito mais.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl w-full">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => onQuickAction(action.id)}
              className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left group"
            >
              <div className={`p-2 rounded-lg bg-white/5 ${action.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-gray-500">
        <Layers className="w-4 h-4" />
        <span>Dica: Use @ para mencionar arquivos e # para comandos especiais</span>
      </div>
    </div>
  );
}

// ============= Main Component =============

export default function ModernAIChat({
  className = '',
  onSendMessage,
  isFullscreen = false,
  onToggleFullscreen,
  showPreview = false,
  onTogglePreview,
}: ModernAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('aethel-pro');
  const [isRecording, setIsRecording] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Mock threads
  const [threads] = useState<ChatThread[]>([
    { id: '1', title: 'Blueprint de movimentação', preview: 'Como criar um sistema de...', updatedAt: new Date(), messageCount: 12 },
    { id: '2', title: 'Shader de água', preview: 'Preciso de um shader PBR...', updatedAt: new Date(Date.now() - 86400000), messageCount: 8 },
    { id: '3', title: 'Sistema de inventário', preview: 'Implementar drag and drop...', updatedAt: new Date(Date.now() - 172800000), messageCount: 24 },
  ]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simular resposta da IA
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model: selectedModel,
      isStreaming: true,
      thinking: [
        { id: '1', title: 'Analisando contexto', content: 'Verificando arquivos do projeto...', status: 'completed', duration: 120 },
        { id: '2', title: 'Processando requisição', content: 'Gerando resposta otimizada...', status: 'running' },
      ],
    };

    setMessages(prev => [...prev, aiMessage]);

    // Simular streaming
    setTimeout(() => {
      setMessages(prev => prev.map(m => 
        m.id === aiMessage.id 
          ? {
              ...m,
              isStreaming: false,
              content: `Claro! Aqui está uma solução para sua requisição:\n\nBaseado no contexto do seu projeto Aethel Engine, posso sugerir a seguinte abordagem:\n\n1. Primeiro, crie um novo Blueprint Actor\n2. Adicione os componentes necessários\n3. Implemente a lógica no Event Graph\n\nPosso detalhar algum passo específico?`,
              thinking: [
                { id: '1', title: 'Analisando contexto', content: 'Verificando arquivos do projeto...', status: 'completed' as const, duration: 120 },
                { id: '2', title: 'Processando requisição', content: 'Gerando resposta otimizada...', status: 'completed' as const, duration: 450 },
              ],
              codeBlocks: [
                {
                  language: 'cpp',
                  filename: 'MyCharacter.cpp',
                  code: `void AMyCharacter::BeginPlay()
{
    Super::BeginPlay();
    
    // Initialize movement
    MovementComponent->MaxWalkSpeed = 600.f;
    MovementComponent->JumpZVelocity = 420.f;
}`,
                },
              ],
            }
          : m
      ));
      setIsLoading(false);
    }, 2000);

    if (onSendMessage) {
      await onSendMessage(input.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (actionId: string) => {
    const prompts: Record<string, string> = {
      explain: 'Explique este código: ',
      fix: 'Encontre e corrija bugs neste código: ',
      optimize: 'Otimize este código para melhor performance: ',
      generate: 'Gere código para: ',
      refactor: 'Refatore este código seguindo boas práticas: ',
      test: 'Crie testes unitários para: ',
    };
    setInput(prompts[actionId] || '');
    inputRef.current?.focus();
  };

  return (
    <div className={`flex h-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 ${className}`}>
      {/* Chat History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-white/10 bg-gray-900/50 overflow-hidden"
          >
            <div className="w-[280px] h-full flex flex-col">
              <div className="p-4 border-b border-white/10">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium transition-all">
                  <Plus className="w-4 h-4" />
                  Nova conversa
                </button>
              </div>
              
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar conversas..."
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{thread.title}</div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">{thread.preview}</div>
                      </div>
                      <MoreHorizontal className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                      <Clock className="w-3 h-3" />
                      {thread.updatedAt.toLocaleDateString('pt-BR')}
                      <span className="text-gray-700">•</span>
                      <MessageSquare className="w-3 h-3" />
                      {thread.messageCount}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-400'}`}
            >
              <History className="w-5 h-5" />
            </button>
            <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} />
          </div>

          <div className="flex items-center gap-2">
            {onTogglePreview && (
              <button
                onClick={onTogglePreview}
                className={`p-2 rounded-lg transition-colors ${showPreview ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-white/5 text-gray-400'}`}
                title="Toggle Preview"
              >
                <Eye className="w-5 h-5" />
              </button>
            )}
            <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState onQuickAction={handleQuickAction} />
          ) : (
            <div className="p-4 space-y-6">
              {messages.map((message, i) => (
                <MessageBubble 
                  key={message.id} 
                  message={message} 
                  isLast={i === messages.length - 1}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-2xl bg-gray-800/80 border border-white/10 focus-within:border-cyan-500/50 transition-colors overflow-hidden">
              {/* Attachments Row */}
              <div className="flex items-center gap-2 px-4 pt-3">
                <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 transition-colors">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 transition-colors">
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 transition-colors">
                  <Code2 className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-white/10" />
                <span className="text-xs text-gray-500">@arquivo #comando</span>
              </div>

              {/* Text Input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte qualquer coisa sobre desenvolvimento de jogos..."
                rows={1}
                className="w-full px-4 py-3 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none"
                style={{ minHeight: '24px', maxHeight: '200px' }}
              />

              {/* Actions Row */}
              <div className="flex items-center justify-between px-4 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsRecording(!isRecording)}
                    className={`p-2 rounded-lg transition-colors ${
                      isRecording 
                        ? 'bg-red-500/20 text-red-400 animate-pulse' 
                        : 'hover:bg-white/5 text-gray-400'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                    input.trim() && !isLoading
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-600">
              <span>Enter para enviar</span>
              <span>•</span>
              <span>Shift+Enter para nova linha</span>
              <span>•</span>
              <span>⌘K para comandos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
