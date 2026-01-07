/**
 * SquadChat - AI Squad com Visualização de Steps
 * 
 * Interface de chat que tangibiliza o trabalho dos agentes de IA.
 * Mostra visualmente o processo de cada agente:
 * - Arquiteto (Roxo): Planejamento
 * - Engenheiro (Azul): Construção
 * - QA (Verde): Validação
 * 
 * Isso justifica o preço do plano Studio e o tempo de espera.
 * 
 * @see DETALHAMENTO_UX_STRATEGY_2026.md - Seção 4
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Brain,
  Code2,
  Shield,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Diff,
  Play,
  X,
  MessageSquare,
  Zap,
  Clock,
  Coins,
} from 'lucide-react';
import useSWR from 'swr';

// ============================================================================
// TIPOS
// ============================================================================

export type AgentRole = 'architect' | 'engineer' | 'qa' | 'orchestrator';
export type TaskPhase = 'planning' | 'building' | 'validating' | 'complete' | 'error';
export type MessageRole = 'user' | 'assistant' | 'system';

interface AgentConfig {
  id: AgentRole;
  name: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
}

interface TaskStep {
  id: string;
  agentId: AgentRole;
  phase: TaskPhase;
  message: string;
  detail?: string;
  code?: string;
  diff?: { before: string; after: string };
  timestamp: Date;
  duration?: number;
}

interface SquadMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  task?: SquadTask;
}

interface SquadTask {
  id: string;
  prompt: string;
  status: TaskPhase;
  steps: TaskStep[];
  result?: string;
  files?: string[];
  creditsUsed: number;
  startTime: Date;
  endTime?: Date;
}

interface SquadChatProps {
  projectId: string;
  onFileChange?: (path: string, content: string) => void;
  onApplyDiff?: (path: string, diff: { before: string; after: string }) => void;
  className?: string;
}

// ============================================================================
// AGENTES CONFIGURAÇÃO
// ============================================================================

const AGENTS: Record<AgentRole, AgentConfig> = {
  architect: {
    id: 'architect',
    name: 'Arquiteto',
    title: 'AI Architect',
    icon: <Brain className="w-5 h-5" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    description: 'Planeja a estrutura e arquitetura da solução',
  },
  engineer: {
    id: 'engineer',
    name: 'Engenheiro',
    title: 'AI Engineer',
    icon: <Code2 className="w-5 h-5" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    description: 'Implementa o código e cria os arquivos',
  },
  qa: {
    id: 'qa',
    name: 'QA',
    title: 'AI Quality',
    icon: <Shield className="w-5 h-5" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    description: 'Valida, testa e garante qualidade',
  },
  orchestrator: {
    id: 'orchestrator',
    name: 'Orquestrador',
    title: 'AI Orchestrator',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    description: 'Coordena o trabalho dos agentes',
  },
};

// ============================================================================
// COMPONENTE: STEP VISUALIZATION
// ============================================================================

interface StepVisualizationProps {
  step: TaskStep;
  isActive: boolean;
  isLast: boolean;
}

function StepVisualization({ step, isActive, isLast }: StepVisualizationProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const agent = AGENTS[step.agentId];

  const handleCopy = useCallback(() => {
    if (step.code) {
      navigator.clipboard.writeText(step.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [step.code]);

  return (
    <div className={`relative pl-8 pb-4 ${!isLast ? 'border-l-2 border-zinc-700 ml-3' : 'ml-3'}`}>
      {/* Agent Avatar */}
      <div className={`
        absolute -left-4 w-8 h-8 rounded-full flex items-center justify-center
        ${agent.bgColor} ${agent.color}
        ${isActive ? 'ring-2 ring-offset-2 ring-offset-zinc-900 animate-pulse' : ''}
      `}>
        {isActive ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : step.phase === 'complete' ? (
          <Check className="w-4 h-4" />
        ) : step.phase === 'error' ? (
          <X className="w-4 h-4 text-red-400" />
        ) : (
          agent.icon
        )}
      </div>

      {/* Step Content */}
      <div className={`
        rounded-lg border transition-all
        ${isActive 
          ? `${agent.bgColor} border-${agent.color.split('-')[1]}-500/50` 
          : 'bg-zinc-800/50 border-zinc-700'
        }
      `}>
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-3 text-left"
        >
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${agent.color}`}>
              {agent.name}
            </span>
            <span className="text-zinc-400 text-sm">
              {step.message}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {step.duration && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {(step.duration / 1000).toFixed(1)}s
              </span>
            )}
            {(step.code || step.diff || step.detail) && (
              expanded ? (
                <ChevronUp className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )
            )}
          </div>
        </button>

        {/* Expanded Content */}
        {expanded && (
          <div className="px-3 pb-3 border-t border-zinc-700">
            {/* Detail Text */}
            {step.detail && (
              <p className="text-sm text-zinc-400 mt-3 whitespace-pre-wrap">
                {step.detail}
              </p>
            )}

            {/* Code Block */}
            {step.code && (
              <div className="mt-3 relative">
                <div className="flex items-center justify-between bg-zinc-900 rounded-t-lg px-3 py-1.5 border border-b-0 border-zinc-700">
                  <span className="text-xs text-zinc-500">código</span>
                  <button
                    onClick={handleCopy}
                    className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <pre className="bg-zinc-950 rounded-b-lg p-3 text-sm text-zinc-300 overflow-x-auto border border-zinc-700">
                  <code>{step.code}</code>
                </pre>
              </div>
            )}

            {/* Diff View */}
            {step.diff && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-red-400 mb-1 block">Antes</span>
                  <pre className="bg-red-500/10 rounded-lg p-2 text-xs text-red-300 overflow-x-auto border border-red-500/30">
                    {step.diff.before}
                  </pre>
                </div>
                <div>
                  <span className="text-xs text-green-400 mb-1 block">Depois</span>
                  <pre className="bg-green-500/10 rounded-lg p-2 text-xs text-green-300 overflow-x-auto border border-green-500/30">
                    {step.diff.after}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: TASK CARD
// ============================================================================

interface TaskCardProps {
  task: SquadTask;
  onApply?: () => void;
  onReject?: () => void;
  onRetry?: () => void;
}

function TaskCard({ task, onApply, onReject, onRetry }: TaskCardProps) {
  const [expanded, setExpanded] = useState(true);
  const currentStepIndex = task.steps.findIndex(s => s.phase !== 'complete');
  const isProcessing = task.status !== 'complete' && task.status !== 'error';
  const duration = task.endTime 
    ? (task.endTime.getTime() - task.startTime.getTime()) / 1000
    : (Date.now() - task.startTime.getTime()) / 1000;

  return (
    <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 overflow-hidden">
      {/* Task Header */}
      <div className="p-4 border-b border-zinc-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-white font-medium mb-1">{task.prompt}</p>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {duration.toFixed(1)}s
              </span>
              <span className="flex items-center gap-1">
                <Coins className="w-3 h-3" />
                {task.creditsUsed} créditos
              </span>
              {task.files && task.files.length > 0 && (
                <span className="flex items-center gap-1">
                  <Code2 className="w-3 h-3" />
                  {task.files.length} arquivos
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-zinc-500 hover:text-white"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="mt-3 h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 animate-pulse"
              style={{ 
                width: `${Math.min(((currentStepIndex + 1) / task.steps.length) * 100, 100)}%`,
                transition: 'width 0.5s ease-out'
              }}
            />
          </div>
        )}
      </div>

      {/* Steps */}
      {expanded && (
        <div className="p-4">
          {task.steps.map((step, index) => (
            <StepVisualization
              key={step.id}
              step={step}
              isActive={index === currentStepIndex && isProcessing}
              isLast={index === task.steps.length - 1}
            />
          ))}

          {/* Result Section */}
          {task.status === 'complete' && task.result && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <Check className="w-5 h-5" />
                <span className="font-medium">Tarefa Concluída</span>
              </div>
              <p className="text-sm text-zinc-300">{task.result}</p>
              
              {/* Files Created */}
              {task.files && task.files.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-zinc-500 mb-2 block">Arquivos modificados:</span>
                  <div className="flex flex-wrap gap-2">
                    {task.files.map((file) => (
                      <span key={file} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300 font-mono">
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={onApply}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Aplicar Mudanças
                </button>
                <button
                  onClick={onReject}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm transition-colors"
                >
                  <X className="w-4 h-4" />
                  Descartar
                </button>
              </div>
            </div>
          )}

          {/* Error Section */}
          {task.status === 'error' && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <X className="w-5 h-5" />
                <span className="font-medium">Erro na Tarefa</span>
              </div>
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors mt-2"
              >
                <RotateCcw className="w-4 h-4" />
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE: MESSAGE BUBBLE
// ============================================================================

interface MessageBubbleProps {
  message: SquadMessage;
  onApply?: () => void;
  onReject?: () => void;
  onRetry?: () => void;
}

function MessageBubble({ message, onApply, onReject, onRetry }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] px-4 py-3 bg-purple-600 rounded-2xl rounded-br-sm">
          <p className="text-white">{message.content}</p>
          <span className="text-xs text-purple-200 mt-1 block">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
      </div>
    );
  }

  if (message.task) {
    return (
      <div className="mb-4">
        <TaskCard
          task={message.task}
          onApply={onApply}
          onReject={onReject}
          onRetry={onRetry}
        />
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[80%] px-4 py-3 bg-zinc-800 rounded-2xl rounded-bl-sm border border-zinc-700">
        <p className="text-zinc-200">{message.content}</p>
        <span className="text-xs text-zinc-500 mt-1 block">
          {message.timestamp.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL: SQUAD CHAT
// ============================================================================

export function SquadChat({ projectId, onFileChange, onApplyDiff, className }: SquadChatProps) {
  const [messages, setMessages] = useState<SquadMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch credit balance
  const { data: wallet } = useSWR('/api/wallet/summary');
  const credits = wallet?.balance ?? 0;

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'system',
        content: '🤖 **Squad AI ativo**\n\nSou sua equipe de IA completa: Arquiteto, Engenheiro e QA trabalhando juntos. Descreva o que precisa e eu planejo, implemento e valido automaticamente.',
        timestamp: new Date(),
      }]);
    }
  }, [messages.length]);

  // Simulate task execution (in production, this calls the real API)
  const executeTask = useCallback(async (prompt: string): Promise<SquadTask> => {
    const task: SquadTask = {
      id: `task-${Date.now()}`,
      prompt,
      status: 'planning',
      steps: [],
      creditsUsed: 0,
      startTime: new Date(),
    };

    // Phase 1: Architect Planning
    await new Promise(r => setTimeout(r, 1500));
    task.steps.push({
      id: `step-1`,
      agentId: 'architect',
      phase: 'complete',
      message: 'Analisando estrutura do projeto...',
      detail: 'Verificando dependências existentes e padrões de código utilizados.',
      timestamp: new Date(),
      duration: 1500,
    });
    task.creditsUsed += 5;

    await new Promise(r => setTimeout(r, 2000));
    task.steps.push({
      id: `step-2`,
      agentId: 'architect',
      phase: 'complete',
      message: 'Criando blueprint da solução',
      detail: `Plano de implementação:\n1. Criar estrutura de dados\n2. Implementar lógica core\n3. Criar interface visual\n4. Conectar eventos`,
      code: `// Blueprint
interface ${prompt.includes('inventário') ? 'InventorySystem' : 'GameSystem'} {
  initialize(): void;
  update(delta: number): void;
  render(): void;
}`,
      timestamp: new Date(),
      duration: 2000,
    });
    task.creditsUsed += 5;
    task.status = 'building';

    // Phase 2: Engineer Building
    await new Promise(r => setTimeout(r, 3000));
    task.steps.push({
      id: `step-3`,
      agentId: 'engineer',
      phase: 'complete',
      message: 'Implementando arquivos principais...',
      code: `// src/systems/GameSystem.ts
export class GameSystem implements ISystem {
  private entities: Entity[] = [];
  
  initialize() {
    console.log('System initialized');
  }
  
  update(delta: number) {
    this.entities.forEach(e => e.update(delta));
  }
}`,
      timestamp: new Date(),
      duration: 3000,
    });
    task.creditsUsed += 10;

    await new Promise(r => setTimeout(r, 2000));
    task.steps.push({
      id: `step-4`,
      agentId: 'engineer',
      phase: 'complete',
      message: 'Criando componentes de UI',
      diff: {
        before: '// Empty file',
        after: `// src/ui/SystemPanel.tsx
export function SystemPanel() {
  return <div className="panel">...</div>;
}`,
      },
      timestamp: new Date(),
      duration: 2000,
    });
    task.creditsUsed += 5;
    task.status = 'validating';

    // Phase 3: QA Validating
    await new Promise(r => setTimeout(r, 1500));
    task.steps.push({
      id: `step-5`,
      agentId: 'qa',
      phase: 'complete',
      message: 'Rodando testes unitários...',
      detail: '✅ 5/5 testes passaram\n✅ Sem vazamento de memória\n✅ Performance OK (< 1ms/frame)',
      timestamp: new Date(),
      duration: 1500,
    });
    task.creditsUsed += 3;

    await new Promise(r => setTimeout(r, 1000));
    task.steps.push({
      id: `step-6`,
      agentId: 'qa',
      phase: 'complete',
      message: 'Verificando segurança e boas práticas',
      detail: '✅ Sem vulnerabilidades conhecidas\n✅ Código TypeScript válido\n✅ Imports organizados',
      timestamp: new Date(),
      duration: 1000,
    });
    task.creditsUsed += 2;

    task.status = 'complete';
    task.endTime = new Date();
    task.result = 'Sistema implementado com sucesso! Os arquivos foram criados e estão prontos para teste.';
    task.files = ['src/systems/GameSystem.ts', 'src/ui/SystemPanel.tsx', 'src/types/index.ts'];

    return task;
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isProcessing) return;
    if (credits < 20) {
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        role: 'system',
        content: '⚠️ Créditos insuficientes. Você precisa de pelo menos 20 créditos para executar uma tarefa do Squad. Recarregue sua carteira para continuar.',
        timestamp: new Date(),
      }]);
      return;
    }

    const userMessage: SquadMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      const task = await executeTask(input);
      
      setMessages(prev => [...prev, {
        id: `task-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        task,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'system',
        content: '❌ Erro ao processar tarefa. Tente novamente.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, [input, isProcessing, credits, executeTask]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className={`flex flex-col h-full bg-zinc-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {Object.values(AGENTS).slice(0, 3).map((agent) => (
              <div
                key={agent.id}
                className={`w-8 h-8 rounded-full ${agent.bgColor} flex items-center justify-center ring-2 ring-zinc-900 ${agent.color}`}
              >
                {agent.icon}
              </div>
            ))}
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Squad</h3>
            <p className="text-xs text-zinc-500">Arquiteto • Engenheiro • QA</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-white">{credits}</span>
          <span className="text-xs text-zinc-500">créditos</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onApply={() => {
              if (message.task?.files) {
                // In production, apply changes to files
                console.log('Applying changes to:', message.task.files);
              }
            }}
            onReject={() => {
              setMessages(prev => prev.filter(m => m.id !== message.id));
            }}
            onRetry={() => {
              if (message.task) {
                setInput(message.task.prompt);
              }
            }}
          />
        ))}
        
        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-3 text-zinc-400">
            <div className="flex -space-x-1">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center animate-pulse">
                <Brain className="w-3 h-3 text-purple-400" />
              </div>
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse delay-100">
                <Code2 className="w-3 h-3 text-blue-400" />
              </div>
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse delay-200">
                <Shield className="w-3 h-3 text-green-400" />
              </div>
            </div>
            <span className="text-sm">Squad trabalhando...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Descreva o que precisa... Ex: Crie um sistema de inventário RPG"
            className="flex-1 resize-none bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 min-h-[48px] max-h-[120px]"
            rows={1}
            disabled={isProcessing}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isProcessing}
            className={`
              p-3 rounded-xl transition-all
              ${input.trim() && !isProcessing
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              }
            `}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-2 text-center">
          ~20 créditos por tarefa • Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
}

export default SquadChat;
