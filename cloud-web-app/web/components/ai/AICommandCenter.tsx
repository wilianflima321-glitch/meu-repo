/**
 * AI Command Center - Central de Comandos de IA
 * 
 * Interface interativa para controlar os agentes de IA do Aethel Engine.
 * Permite executar comandos em linguagem natural e monitorar execuções.
 * 
 * @module components/ai/AICommandCenter
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  AGENTS, 
  AgentExecutor, 
  AgentExecution, 
  AgentStep, 
  Agent,
  AgentTask,
} from '../../lib/ai-agent-system';

// ============================================================================
// TIPOS
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  execution?: AgentExecution;
  isStreaming?: boolean;
}

interface CommandSuggestion {
  command: string;
  description: string;
  agentId: string;
}

// ============================================================================
// SUGESTÕES DE COMANDOS
// ============================================================================

const COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  { command: 'Crie um cubo 3D vermelho', description: 'Cria objeto com geometria e material', agentId: 'game-designer' },
  { command: 'Gere uma textura de pedra', description: 'Gera textura procedural', agentId: 'artist' },
  { command: 'Crie um script de movimento WASD', description: 'Cria script de controle de personagem', agentId: 'coder' },
  { command: 'Gere música de fundo ambiente', description: 'Cria trilha sonora', agentId: 'sound-designer' },
  { command: 'Crie um level de teste', description: 'Gera level básico para protótipo', agentId: 'game-designer' },
  { command: 'Analise a arquitetura do projeto', description: 'Revisa estrutura e sugere melhorias', agentId: 'architect' },
  { command: 'Crie um inimigo com IA básica', description: 'Cria personagem com comportamento', agentId: 'universal' },
  { command: 'Otimize o código do projeto', description: 'Analisa e melhora performance', agentId: 'coder' },
];

function resolveUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  return (
    localStorage.getItem('aethel.user.id') ||
    localStorage.getItem('aethel.auth.userId') ||
    'anonymous'
  );
}

function resolveProjectId(): string {
  if (typeof window === 'undefined') return 'default';
  const params = new URLSearchParams(window.location.search);
  const queryProjectId = params.get('projectId');
  return queryProjectId || localStorage.getItem('aethel.workbench.lastProjectId') || 'default';
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function AICommandCenter() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('universal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [activeExecution, setActiveExecution] = useState<AgentExecution | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Adicionar mensagem de boas-vindas
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'system',
        content: `🤖 **Bem-vindo ao AI Command Center**\n\nEu sou o assistente de IA do Aethel Engine. Posso ajudar você a:\n\n• Criar objetos, scripts e assets\n• Gerar texturas, sons e músicas\n• Analisar e otimizar código\n• Projetar levels e mecânicas\n\nSelecione um agente especializado ou use o Universal para tarefas complexas. Digite seu comando em linguagem natural!`,
        timestamp: new Date(),
      }]);
    }
  }, [messages.length]);

  // Processar comando
  const processCommand = useCallback(async (command: string) => {
    if (!command.trim() || isProcessing) return;

    setShowSuggestions(false);
    setIsProcessing(true);

    // Adicionar mensagem do usuário
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: command,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Criar mensagem de assistente em streaming
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '🔄 Processando...',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Executar agente
      const executor = new AgentExecutor(selectedAgent);
      const task: AgentTask = {
        id: `task-${Date.now()}`,
        description: command,
        executionContext: {
          userId: resolveUserId(),
          projectId: resolveProjectId(),
        },
      };

      const execution = await executor.execute(task);
      setActiveExecution(execution);

      // Atualizar mensagem com resultado
      const resultContent = formatExecutionResult(execution);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: resultContent, execution, isStreaming: false }
          : msg
      ));

    } catch (error) {
      const errorContent = `❌ **Erro:** ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: errorContent, isStreaming: false }
          : msg
      ));
    } finally {
      setIsProcessing(false);
    }
  }, [selectedAgent, isProcessing]);

  // Formatar resultado da execução
  const formatExecutionResult = (execution: AgentExecution): string => {
    let result = '';

    if (execution.status === 'completed') {
      result += '✅ **Tarefa concluída!**\n\n';
    } else if (execution.status === 'failed') {
      result += '❌ **Tarefa falhou**\n\n';
      if (execution.error) {
        result += `Erro: ${execution.error}\n\n`;
      }
    }

    if (execution.finalAnswer) {
      result += execution.finalAnswer + '\n\n';
    }

    if (execution.steps.length > 0) {
      result += '**📋 Passos executados:**\n';
      execution.steps.forEach((step, i) => {
        result += `${i + 1}. ${step.thought}\n`;
        if (step.action) {
          result += `   → ${step.action.tool}\n`;
        }
      });
      result += '\n';
    }

    if (execution.artifacts.length > 0) {
      result += '**📦 Artifacts criados:**\n';
      execution.artifacts.forEach(artifact => {
        result += `• ${artifact.name} (${artifact.type})\n`;
      });
    }

    return result || 'Execução concluída sem resultado visível.';
  };

  // Handler de submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processCommand(input);
  };

  // Handler de sugestão
  const handleSuggestion = (suggestion: CommandSuggestion) => {
    setSelectedAgent(suggestion.agentId);
    processCommand(suggestion.command);
  };

  const agentList = Object.values(AGENTS);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold">AI Command Center</h2>
            <p className="text-xs text-slate-400">
              Agente: <span className="text-sky-400">{AGENTS[selectedAgent]?.name}</span>
            </p>
          </div>
        </div>
        
        {/* Agent Selector */}
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="px-3 py-1.5 text-sm bg-slate-700 border border-slate-600 rounded-lg 
                     text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          {agentList.map(agent => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {/* Suggestions */}
        {showSuggestions && messages.length <= 1 && (
          <div className="mt-6">
            <p className="text-sm text-slate-400 mb-3">💡 Sugestões de comandos:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {COMMAND_SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(suggestion)}
                  className="p-3 text-left bg-slate-800 hover:bg-slate-700 rounded-lg border 
                             border-slate-700 hover:border-sky-500 transition-colors group"
                >
                  <p className="text-sm text-slate-200 group-hover:text-white">
                    {suggestion.command}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {suggestion.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Execution Details Panel */}
      {activeExecution && activeExecution.steps.length > 0 && (
        <ExecutionPanel 
          execution={activeExecution} 
          onClose={() => setActiveExecution(null)} 
        />
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite um comando... (ex: Crie um cubo 3D azul)"
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg
                       text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 
                       focus:ring-sky-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="px-6 py-3 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 
                       disabled:cursor-not-allowed rounded-lg font-medium transition-colors
                       flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
                  />
                </svg>
                Processando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13 10V3L4 14h7v7l9-11h-7z" 
                  />
                </svg>
                Executar
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser
            ? 'bg-sky-500 text-white'
            : isSystem
            ? 'bg-slate-800 border border-slate-700'
            : 'bg-slate-800'
        } ${message.isStreaming ? 'animate-pulse' : ''}`}
      >
        <div 
          className="text-sm whitespace-pre-wrap prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
        />
        <p className="text-xs opacity-60 mt-2">
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

function ExecutionPanel({ 
  execution, 
  onClose 
}: { 
  execution: AgentExecution; 
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-slate-700 bg-slate-800/80">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-sm hover:bg-slate-700/50"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
            />
          </svg>
          {execution.steps.length} passos executados
          {execution.artifacts.length > 0 && (
            <span className="text-green-400">• {execution.artifacts.length} artifacts</span>
          )}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 space-y-3 max-h-64 overflow-y-auto">
          {execution.steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}
          
          {execution.artifacts.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-2">Artifacts:</p>
              <div className="flex flex-wrap gap-2">
                {execution.artifacts.map((artifact, i) => (
                  <span 
                    key={i}
                    className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded"
                  >
                    {artifact.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepCard({ step, index }: { step: AgentStep; index: number }) {
  return (
    <div className="p-3 bg-slate-900 rounded border border-slate-700">
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center text-xs">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-300">{step.thought}</p>
          {step.action && (
            <p className="text-xs text-sky-400 mt-1">
              → {step.action.tool}
            </p>
          )}
          {step.observation && (
            <p className="text-xs text-slate-500 mt-1 truncate">
              {step.observation.substring(0, 100)}...
            </p>
          )}
        </div>
        {step.result?.success !== undefined && (
          <span className={`text-xs ${step.result.success ? 'text-green-400' : 'text-red-400'}`}>
            {step.result.success ? '✓' : '✗'}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// UTILIDADES
// ============================================================================

function formatMarkdown(text: string): string {
  // Formatação simples de markdown
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-700 px-1 rounded">$1</code>')
    .replace(/\n/g, '<br/>');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AICommandCenter;
