'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Play,
  Pause,
  Square,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Brain,
  Zap,
  MessageSquare,
  Terminal,
  FileCode,
  Search,
  Settings,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ScrollArea } from '@/components/ui/ScrollArea';
import {
  AutonomousAgent,
  AgentTask,
  AgentStep,
  ToolCall,
} from '@/lib/ai/agent-mode';

/**
 * Agent Mode Panel - Interface do modo agente autônomo
 * 
 * Similar ao Manus/Devin com:
 * - Visualização do plano e progresso
 * - Steps em tempo real
 * - Aprovação de ações
 * - Pause/Resume/Stop controls
 * - Memory viewer
 */

interface AgentModePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentModePanel({ isOpen, onClose }: AgentModePanelProps) {
  const [input, setInput] = useState('');
  const [agent] = useState(() => new AutonomousAgent({
    autonomyLevel: 'semi-autonomous',
    requireApproval: true,
    enableSelfCorrection: true,
  }));
  
  const [task, setTask] = useState<AgentTask | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [pendingApproval, setPendingApproval] = useState<any>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Agent event handlers
  useEffect(() => {
    const handleTaskStarted = (t: AgentTask) => {
      setTask(t);
      setStatus('running');
    };
    
    const handleTaskCompleted = (t: AgentTask) => {
      setTask(t);
      setStatus('completed');
    };
    
    const handleTaskFailed = (t: AgentTask) => {
      setTask(t);
      setStatus('failed');
    };
    
    const handleStepAdded = (step: AgentStep) => {
      setSteps(prev => [...prev, step]);
      // Auto-scroll
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    };
    
    const handleProgress = ({ progress: p }: { progress: number }) => {
      setProgress(p);
    };
    
    const handleApprovalNeeded = (approval: any) => {
      setPendingApproval(approval);
    };
    
    const handlePaused = () => {
      setStatus('paused');
    };
    
    const handleResumed = () => {
      setStatus('running');
    };
    
    agent.on('task:started', handleTaskStarted);
    agent.on('task:completed', handleTaskCompleted);
    agent.on('task:failed', handleTaskFailed);
    agent.on('step:added', handleStepAdded);
    agent.on('agent:progress', handleProgress);
    agent.on('agent:approval_needed', handleApprovalNeeded);
    agent.on('agent:paused', handlePaused);
    agent.on('agent:resumed', handleResumed);
    
    return () => {
      agent.removeAllListeners();
    };
  }, [agent]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || status === 'running') return;
    
    setSteps([]);
    setProgress(0);
    setPendingApproval(null);
    
    await agent.execute(input.trim());
    setInput('');
  }, [input, status, agent]);

  const handleApprove = () => {
    if (pendingApproval) {
      pendingApproval.approve();
      setPendingApproval(null);
    }
  };

  const handleReject = () => {
    if (pendingApproval) {
      pendingApproval.reject();
      setPendingApproval(null);
    }
  };

  const handlePause = () => {
    agent.pause();
  };

  const handleResume = () => {
    agent.resume();
  };

  const handleStop = () => {
    agent.stop();
    setStatus('idle');
  };

  const toggleStepExpand = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const getStepIcon = (type: AgentStep['type']) => {
    switch (type) {
      case 'think': return Brain;
      case 'plan': return FileCode;
      case 'execute': return Zap;
      case 'observe': return Search;
      case 'reflect': return MessageSquare;
      case 'correct': return Settings;
      default: return ChevronRight;
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'running': return 'text-blue-400';
      case 'paused': return 'text-yellow-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 bottom-0 w-[500px] bg-[#1e1e2e] border-l border-[#313244] shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#313244]">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-400" />
          <span className="font-semibold text-white">Agent Mode</span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full bg-opacity-20', getStatusColor(status))}>
            {status.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {status === 'running' && (
            <Button variant="ghost" size="icon" onClick={handlePause} className="h-8 w-8">
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {status === 'paused' && (
            <Button variant="ghost" size="icon" onClick={handleResume} className="h-8 w-8">
              <Play className="h-4 w-4" />
            </Button>
          )}
          {(status === 'running' || status === 'paused') && (
            <Button variant="ghost" size="icon" onClick={handleStop} className="h-8 w-8 text-red-400">
              <Square className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            ✕
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {status === 'running' && (
        <div className="h-1 bg-[#313244]">
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Task Info */}
      {task && (
        <div className="px-4 py-3 border-b border-[#313244] bg-[#181825]">
          <div className="flex items-center gap-2 mb-2">
            {task.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-400" />}
            {task.status === 'failed' && <XCircle className="h-4 w-4 text-red-400" />}
            {(task.status === 'executing' || task.status === 'planning') && (
              <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
            )}
            <span className="text-sm text-white font-medium">
              {task.description.slice(0, 50)}...
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#6c7086]">
            <span>{task.subtasks.length} subtarefas</span>
            <span>{steps.length} passos</span>
            <span>{progress}% completo</span>
          </div>
        </div>
      )}

      {/* Pending Approval */}
      <AnimatePresence>
        {pendingApproval && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">Aprovação Necessária</span>
            </div>
            <p className="text-xs text-[#cdd6f4] mb-2">{pendingApproval.thinking}</p>
            <div className="p-2 bg-[#1e1e2e] rounded text-xs font-mono text-[#a6adc8] mb-3">
              {pendingApproval.action.tool}: {JSON.stringify(pendingApproval.action.input)}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Aprovar
              </Button>
              <Button size="sm" variant="outline" onClick={handleReject} className="border-red-500 text-red-400">
                <XCircle className="h-3 w-3 mr-1" />
                Rejeitar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steps */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-2">
          {steps.map((step) => {
            const StepIcon = getStepIcon(step.type);
            const isExpanded = expandedSteps.has(step.id);
            
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#181825] rounded-lg border border-[#313244] overflow-hidden"
              >
                <button
                  onClick={() => toggleStepExpand(step.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#313244]/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-[#6c7086]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[#6c7086]" />
                  )}
                  <StepIcon className={cn(
                    'h-4 w-4',
                    step.type === 'think' && 'text-blue-400',
                    step.type === 'plan' && 'text-blue-400',
                    step.type === 'execute' && 'text-green-400',
                    step.type === 'observe' && 'text-yellow-400',
                    step.type === 'reflect' && 'text-cyan-400',
                    step.type === 'correct' && 'text-orange-400',
                  )} />
                  <span className="text-xs font-medium text-[#cdd6f4] capitalize">
                    {step.type}
                  </span>
                  <span className="text-xs text-[#6c7086] truncate flex-1">
                    {step.content.slice(0, 40)}...
                  </span>
                  <span className="text-xs text-[#6c7086]">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </span>
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 py-2 border-t border-[#313244] bg-[#11111b]">
                        <p className="text-xs text-[#a6adc8] whitespace-pre-wrap">
                          {step.content}
                        </p>
                        
                        {step.toolCalls && step.toolCalls.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {step.toolCalls.map((tc) => (
                              <div
                                key={tc.id}
                                className="p-2 bg-[#1e1e2e] rounded text-xs"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Terminal className="h-3 w-3 text-[#6c7086]" />
                                  <span className="font-mono text-[#89b4fa]">{tc.tool}</span>
                                  <span className={cn(
                                    'px-1 py-0.5 rounded text-[10px]',
                                    tc.status === 'success' && 'bg-green-500/20 text-green-400',
                                    tc.status === 'failed' && 'bg-red-500/20 text-red-400',
                                    tc.status === 'running' && 'bg-blue-500/20 text-blue-400',
                                  )}>
                                    {tc.status}
                                  </span>
                                </div>
                                <pre className="text-[#6c7086] overflow-auto max-h-20">
                                  {JSON.stringify(tc.input, null, 2)}
                                </pre>
                                {tc.output && (
                                  <pre className="mt-1 text-[#a6e3a1] overflow-auto max-h-20">
                                    {typeof tc.output === 'string' 
                                      ? tc.output.slice(0, 200) 
                                      : JSON.stringify(tc.output, null, 2).slice(0, 200)}
                                  </pre>
                                )}
                                {tc.error && (
                                  <pre className="mt-1 text-[#f38ba8]">{tc.error}</pre>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
          
          {steps.length === 0 && status === 'idle' && (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-[#313244] mx-auto mb-4" />
              <p className="text-[#6c7086] text-sm">
                Descreva uma tarefa e o agente irá executá-la autonomamente
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-[#313244]">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Descreva a tarefa para o agente executar..."
            className="min-h-[80px] bg-[#181825] border-[#313244] text-white placeholder:text-[#6c7086] resize-none pr-12"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={status === 'running'}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!input.trim() || status === 'running'}
            className="absolute bottom-2 right-2 h-8 w-8 bg-blue-600 hover:bg-blue-700"
          >
            {status === 'running' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-[#6c7086] mt-2">
          Pressione <kbd className="px-1 bg-[#313244] rounded">Ctrl</kbd> + <kbd className="px-1 bg-[#313244] rounded">Enter</kbd> para enviar
        </p>
      </div>
    </motion.div>
  );
}

export default AgentModePanel;
