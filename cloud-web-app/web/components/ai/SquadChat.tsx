'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Brain, Code2, Coins, Loader2, Send, Shield } from 'lucide-react';
import useSWR from 'swr';

import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing';

import { AGENTS } from './SquadChat.agents';
import { MessageBubble } from './SquadChat.parts';
import type { SquadChatProps, SquadMessage, SquadTask } from './SquadChat.types';

// ============================================================================
// COMPONENTE PRINCIPAL: SQUAD CHAT
// ============================================================================

export function SquadChat({ projectId, onFileChange, onApplyDiff, className }: SquadChatProps) {
  const [messages, setMessages] = useState<SquadMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const pushSystemMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, {
      id: `system-${Date.now()}`,
      role: 'system',
      content,
      timestamp: new Date(),
    }]);
  }, []);

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
        content: 'Squad de IA active. Sou sua equipe completa: Arquiteto, Engenheiro e QA trabalhando juntos. Descreva o que precisa e eu planejo, implemento e valido automaticamente.',
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
      message: 'Analyzing project structure...',
      detail: 'Checking dependencias existentes e padroes de codigo utilizados.',
      timestamp: new Date(),
      duration: 1500,
    });
    task.creditsUsed += 5;

    await new Promise(r => setTimeout(r, 2000));
    task.steps.push({
      id: `step-2`,
      agentId: 'architect',
      phase: 'complete',
      message: 'Creating blueprint da solution',
      detail: `Plano de implementacao:\n1. Create estrutura de dados\n2. Implementar logica core\n3. Create interface visual\n4. Conectar eventos`,
      code: `// Blueprint
interface ${prompt.includes('inventario') ? 'InventorySystem' : 'GameSystem'} {
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
      message: 'Implementing files principais...',
      code: `// src/systems/GameSystem.ts
export class GameSystem implements ISystem {
  private entities: Entity[] = [];

  initialize() {
    this.entities = [];
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
      message: 'Creating componentes de UI',
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
      message: 'Running unit tests...',
      detail: 'OK 5/5 testes passaram\nOK Sem vazamento de memoria\nOK Performance OK (< 1ms/frame)',
      timestamp: new Date(),
      duration: 1500,
    });
    task.creditsUsed += 3;

    await new Promise(r => setTimeout(r, 1000));
    task.steps.push({
      id: `step-6`,
      agentId: 'qa',
      phase: 'complete',
      message: 'Checking security and best practices',
      detail: 'OK Sem vulnerabilidades conhecidas\nOK Codigo TypeScript valido\nOK Imports organizados',
      timestamp: new Date(),
      duration: 1000,
    });
    task.creditsUsed += 2;

    task.status = 'complete';
    task.endTime = new Date();
    task.result = 'Sistema implementado com sucesso. Os files foram criados e estao prontos para teste.';
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
        content: 'Not enough credits. You need at least 20 credits to run a Squad task. Reload your wallet to continue.',
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
        content: 'Error processing task. Tente novamente.',
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

  const shellClass = [
    'flex h-full flex-col overflow-hidden rounded-[24px] border border-[var(--aethel-border-subtle)]',
    'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_92%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_96%,transparent))]',
    'shadow-[0_24px_80px_rgba(0,0,0,0.18)]',
  ].join(' ');

  return (
    <div className={`${shellClass} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {Object.values(AGENTS).slice(0, 3).map((agent) => (
              <div
                key={agent.id}
                className={`w-8 h-8 rounded-full ${agent.bgColor} flex items-center justify-center ring-2 ring-[var(--aethel-surface-primary)] ${agent.color}`}
              >
                {agent.icon}
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[var(--aethel-text-primary)]">Squad de IA</h3>
              {projectId ? (
                <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
                  project {projectId}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-[var(--aethel-text-quaternary)]">Architect - Engineer - QA</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--aethel-surface-secondary)] rounded-lg border border-[var(--aethel-border-primary)]">
          <Coins className="w-4 h-4 text-[var(--aethel-warning-light)]" />
          <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{credits}</span>
          <span className="text-xs text-[var(--aethel-text-quaternary)]">credits</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onApply={() => {
              if (!message.task) return;
              if (!onFileChange && !onApplyDiff) {
                pushSystemMessage('Proposal ready for manual review. No file change was applied automatically.');
                return;
              }
              pushSystemMessage('Automatic apply is still pending here. Review the diff in the main copilot.');
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
          <div className="flex items-center gap-3 text-[var(--aethel-text-tertiary)]" role="status" aria-live="polite">
            <div className="flex -space-x-1">
              <div className="w-6 h-6 rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] flex items-center justify-center animate-pulse">
                <Brain className="w-3 h-3 text-[var(--aethel-info)]" />
              </div>
              <div className="w-6 h-6 rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] flex items-center justify-center animate-pulse delay-100">
                <Code2 className="w-3 h-3 text-[var(--aethel-info)]" />
              </div>
              <div className="w-6 h-6 rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] flex items-center justify-center animate-pulse delay-200">
                <Shield className="w-3 h-3 text-[var(--aethel-success)]" />
              </div>
            </div>
            <span className="text-sm">Squad trabalhando...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[var(--aethel-border-primary)]">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Descreva o que precisa... Ex: Crie um sistema de inventario RPG"
            className="flex-1 resize-none bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-xl px-4 py-3 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] focus:outline-none focus:border-[var(--aethel-primary)] min-h-[48px] max-h-[120px]"
            rows={1}
            disabled={isProcessing}
            aria-label="Descreva sua tarefa para o squad de IA"
          />
          <button type="button" aria-label="Send tarefa ao squad"
            onClick={handleSubmit}
            disabled={!input.trim() || isProcessing}
            className={`
              p-3 rounded-xl transition-all
              ${input.trim() && !isProcessing
                ? 'bg-[var(--aethel-primary)] hover:brightness-110 text-[var(--aethel-text-primary)]'
                : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-quaternary)] cursor-not-allowed'
              } ${CANONICAL_FOCUS} ${CANONICAL_MOTION}
            `}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-[var(--aethel-text-quaternary)] mt-2 text-center">
          ~20 creditos por tarefa - Shift+Enter para quebrar linha
        </p>
      </div>
    </div>
  );
}

export default SquadChat;
