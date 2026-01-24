/**
 * OnboardingChecklist - Widget de Checklist de Onboarding
 * 
 * Gamificação do onboarding com progresso visual.
 * Cada tarefa completada dá XP e badges.
 * Persistido no localStorage + backend.
 * 
 * @see ROADMAP_MONETIZACAO_XP_FINAL.md
 * @see ALINHAMENTO_UX_INVISIBLE_2026.md
 * 
 * @module components/onboarding/OnboardingChecklist
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import {
  CheckCircle2,
  Circle,
  Trophy,
  Star,
  Gift,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Play,
  Zap,
  Target,
  Rocket,
  X,
  ExternalLink,
  HelpCircle,
  Lock,
  Award,
  Flame,
} from 'lucide-react';

// ============================================================================
// CONFETTI UTILITY (Pure CSS implementation - no external deps)
// ============================================================================

const createConfetti = () => {
  if (typeof window === 'undefined') return;
  
  // Create container
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
  `;
  document.body.appendChild(container);

  // Create confetti pieces
  const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#22c55e', '#fbbf24', '#f472b6', '#38bdf8'];
  const shapes = ['◆', '●', '■', '★', '▲'];
  
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = 1 + Math.random() * 1;
    const size = 10 + Math.random() * 10;
    
    piece.textContent = shape;
    piece.style.cssText = `
      position: absolute;
      left: ${left}%;
      top: -20px;
      font-size: ${size}px;
      color: ${color};
      animation: confettiFall ${duration}s ease-out ${delay}s forwards;
      transform: rotate(${Math.random() * 360}deg);
    `;
    container.appendChild(piece);
  }

  // Add animation if not exists
  if (!document.getElementById('confetti-styles')) {
    const style = document.createElement('style');
    style.id = 'confetti-styles';
    style.textContent = `
      @keyframes confettiFall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Cleanup after animation
  setTimeout(() => container.remove(), 3000);
};

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: 'basics' | 'creation' | 'advanced' | 'social';
  xpReward: number;
  badgeId?: string;
  completed: boolean;
  completedAt?: number;
  action?: {
    type: 'navigate' | 'tutorial' | 'action';
    target: string;
    label: string;
  };
  prerequisite?: string; // Task ID required before this one
  optional?: boolean;
}

export interface OnboardingProgress {
  userId: string;
  tasks: OnboardingTask[];
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  badges: string[];
  startedAt: number;
  completedAt?: number;
}

interface OnboardingChecklistProps {
  userId?: string;
  variant?: 'sidebar' | 'modal' | 'inline';
  onTaskComplete?: (task: OnboardingTask) => void;
  onAllComplete?: () => void;
  onNavigate?: (target: string) => void;
  onDismiss?: () => void;
  onStartTour?: () => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TASKS: OnboardingTask[] = [
  // Basics
  {
    id: 'welcome',
    title: 'Bem-vindo ao Aethel',
    description: 'Complete o tutorial de boas-vindas',
    category: 'basics',
    xpReward: 50,
    completed: false,
    action: { type: 'tutorial', target: 'welcome-wizard', label: 'Iniciar' },
  },
  {
    id: 'profile',
    title: 'Configure seu perfil',
    description: 'Adicione foto e informações básicas',
    category: 'basics',
    xpReward: 25,
    completed: false,
    action: { type: 'navigate', target: '/settings/profile', label: 'Configurar' },
  },
  {
    id: 'explore-editor',
    title: 'Explore o editor',
    description: 'Conheça a interface principal',
    category: 'basics',
    xpReward: 50,
    completed: false,
    prerequisite: 'welcome',
    action: { type: 'tutorial', target: 'editor-tour', label: 'Ver Tour' },
  },
  // Creation
  {
    id: 'first-project',
    title: 'Crie seu primeiro projeto',
    description: 'Use um template ou comece do zero',
    category: 'creation',
    xpReward: 100,
    badgeId: 'creator',
    completed: false,
    prerequisite: 'explore-editor',
    action: { type: 'navigate', target: '/projects/new', label: 'Criar' },
  },
  {
    id: 'first-asset',
    title: 'Gere um asset com IA',
    description: 'Crie uma textura, modelo 3D ou som',
    category: 'creation',
    xpReward: 75,
    completed: false,
    prerequisite: 'first-project',
    action: { type: 'navigate', target: '/generate', label: 'Gerar' },
  },
  {
    id: 'first-blueprint',
    title: 'Crie um Blueprint',
    description: 'Programe visualmente sem código',
    category: 'creation',
    xpReward: 100,
    badgeId: 'programmer',
    completed: false,
    prerequisite: 'first-project',
    action: { type: 'tutorial', target: 'blueprint-intro', label: 'Aprender' },
  },
  // Advanced
  {
    id: 'render-scene',
    title: 'Renderize uma cena',
    description: 'Exporte uma imagem ou vídeo',
    category: 'advanced',
    xpReward: 100,
    completed: false,
    prerequisite: 'first-asset',
    action: { type: 'navigate', target: '/render', label: 'Renderizar' },
  },
  {
    id: 'build-game',
    title: 'Compile um jogo',
    description: 'Gere um executável ou WebGL',
    category: 'advanced',
    xpReward: 150,
    badgeId: 'developer',
    completed: false,
    prerequisite: 'first-blueprint',
    action: { type: 'navigate', target: '/build', label: 'Compilar' },
  },
  // Social
  {
    id: 'share-project',
    title: 'Compartilhe um projeto',
    description: 'Publique na galeria ou exporte',
    category: 'social',
    xpReward: 75,
    completed: false,
    optional: true,
    action: { type: 'navigate', target: '/share', label: 'Compartilhar' },
  },
  {
    id: 'join-community',
    title: 'Entre na comunidade',
    description: 'Conecte-se com outros criadores',
    category: 'social',
    xpReward: 50,
    completed: false,
    optional: true,
    action: { type: 'navigate', target: '/community', label: 'Entrar' },
  },
];

const CATEGORY_INFO = {
  basics: { label: 'Básico', icon: Target, color: 'text-sky-400' },
  creation: { label: 'Criação', icon: Sparkles, color: 'text-violet-400' },
  advanced: { label: 'Avançado', icon: Rocket, color: 'text-amber-400' },
  social: { label: 'Social', icon: Star, color: 'text-emerald-400' },
};

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 5000];

// ============================================================================
// FETCHER
// ============================================================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

// ============================================================================
// HOOKS
// ============================================================================

function useLocalProgress(userId?: string): [OnboardingProgress | null, (p: OnboardingProgress) => void] {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  useEffect(() => {
    const key = `onboarding_${userId || 'guest'}`;
    const stored = localStorage.getItem(key);
    
    if (stored) {
      setProgress(JSON.parse(stored));
    } else {
      // Initialize new progress
      const initial: OnboardingProgress = {
        userId: userId || 'guest',
        tasks: DEFAULT_TASKS,
        totalXP: 0,
        currentStreak: 0,
        longestStreak: 0,
        level: 1,
        badges: [],
        startedAt: Date.now(),
      };
      setProgress(initial);
      localStorage.setItem(key, JSON.stringify(initial));
    }
  }, [userId]);

  const updateProgress = useCallback((newProgress: OnboardingProgress) => {
    const key = `onboarding_${userId || 'guest'}`;
    setProgress(newProgress);
    localStorage.setItem(key, JSON.stringify(newProgress));
  }, [userId]);

  return [progress, updateProgress];
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ProgressRing({ progress, size = 80 }: { progress: number; size?: number }) {
  const circumference = 2 * Math.PI * ((size - 8) / 2);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 8) / 2}
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className="text-zinc-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 8) / 2}
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className="text-violet-500"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

interface TaskItemProps {
  task: OnboardingTask;
  isLocked: boolean;
  onComplete: (task: OnboardingTask) => void;
  onAction: (task: OnboardingTask) => void;
}

function TaskItem({ task, isLocked, onComplete, onAction }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const categoryInfo = CATEGORY_INFO[task.category];
  const CategoryIcon = categoryInfo.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-lg border transition-all
        ${task.completed 
          ? 'bg-emerald-500/10 border-emerald-500/30' 
          : isLocked 
            ? 'bg-zinc-800/30 border-zinc-700/50 opacity-60'
            : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
        }
      `}
    >
      <button
        onClick={() => !isLocked && setIsExpanded(!isExpanded)}
        disabled={isLocked}
        className="w-full flex items-center gap-3 p-3"
      >
        {/* Status icon */}
        <div className="flex-shrink-0">
          {task.completed ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
            </motion.div>
          ) : isLocked ? (
            <Lock className="w-6 h-6 text-zinc-600" />
          ) : (
            <Circle className="w-6 h-6 text-zinc-500" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${task.completed ? 'text-emerald-300' : 'text-white'}`}>
              {task.title}
            </span>
            {task.optional && (
              <span className="px-1.5 py-0.5 bg-zinc-700 rounded text-[10px] text-zinc-400">
                Opcional
              </span>
            )}
          </div>
          
          {!isExpanded && (
            <p className="text-xs text-zinc-500 mt-0.5">{task.description}</p>
          )}
        </div>

        {/* XP badge */}
        <div className={`
          flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
          ${task.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-violet-500/20 text-violet-400'}
        `}>
          <Zap className="w-3 h-3" />
          +{task.xpReward} XP
        </div>

        {/* Expand */}
        {!isLocked && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="flex-shrink-0"
          >
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </motion.div>
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && !isLocked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pl-12">
              <p className="text-sm text-zinc-400 mb-3">{task.description}</p>
              
              <div className="flex items-center gap-2">
                {task.action && !task.completed && (
                  <button
                    onClick={() => onAction(task)}
                    className="flex items-center gap-1.5 px-3 py-1.5
                             bg-violet-600 hover:bg-violet-500 rounded-lg
                             text-xs font-medium transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {task.action.label}
                  </button>
                )}

                {!task.completed && (
                  <button
                    onClick={() => onComplete(task)}
                    className="flex items-center gap-1.5 px-3 py-1.5
                             bg-zinc-700 hover:bg-zinc-600 rounded-lg
                             text-xs text-zinc-300 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Marcar como feito
                  </button>
                )}

                {task.badgeId && (
                  <div className="ml-auto flex items-center gap-1 text-xs text-amber-400">
                    <Award className="w-3.5 h-3.5" />
                    Badge: {task.badgeId}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LevelUpNotification({ level, onClose }: { level: number; onClose: () => void }) {
  useEffect(() => {
    // Trigger confetti celebration
    createConfetti();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className="bg-gradient-to-br from-violet-900 to-fuchsia-900 
                 p-8 rounded-2xl text-center border border-violet-500/30"
        onClick={e => e.stopPropagation()}
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: 2 }}
          className="text-6xl mb-4"
        >
          🎉
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Nível {level}!
        </h2>
        <p className="text-violet-200">
          Parabéns! Continue assim!
        </p>
        <button
          onClick={onClose}
          className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 
                   rounded-lg text-white transition-colors"
        >
          Continuar
        </button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OnboardingChecklist({
  userId,
  variant = 'sidebar',
  onTaskComplete,
  onAllComplete,
  onNavigate,
  onDismiss,
  onStartTour,
  className = '',
}: OnboardingChecklistProps) {
  const [localProgress, updateLocalProgress] = useLocalProgress(userId);
  const [showLevelUp, setShowLevelUp] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Sync with server
  const { data: serverProgress, mutate } = useSWR<OnboardingProgress>(
    userId ? `/api/onboarding/${userId}` : null,
    fetcher,
    { fallbackData: localProgress || undefined }
  );

  const progress = serverProgress || localProgress;

  // Calculate completion
  const completedCount = progress?.tasks.filter(t => t.completed).length || 0;
  const requiredCount = progress?.tasks.filter(t => !t.optional).length || 0;
  const requiredCompleted = progress?.tasks.filter(t => !t.optional && t.completed).length || 0;
  const totalCount = progress?.tasks.length || 0;
  const completionPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Calculate level
  const currentLevel = useMemo(() => {
    if (!progress) return 1;
    const xp = progress.totalXP;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
    }
    return 1;
  }, [progress?.totalXP]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!progress) return [];
    if (activeCategory === 'all') return progress.tasks;
    return progress.tasks.filter(t => t.category === activeCategory);
  }, [progress, activeCategory]);

  // Check if task is locked
  const isTaskLocked = useCallback((task: OnboardingTask) => {
    if (!task.prerequisite || !progress) return false;
    const prereq = progress.tasks.find(t => t.id === task.prerequisite);
    return prereq ? !prereq.completed : false;
  }, [progress]);

  // Complete task
  const handleComplete = useCallback(async (task: OnboardingTask) => {
    if (!progress) return;

    const updatedTasks = progress.tasks.map(t => 
      t.id === task.id ? { ...t, completed: true, completedAt: Date.now() } : t
    );

    const newXP = progress.totalXP + task.xpReward;
    const newBadges = task.badgeId && !progress.badges.includes(task.badgeId)
      ? [...progress.badges, task.badgeId]
      : progress.badges;

    // Check level up
    const oldLevel = currentLevel;
    const newLevel = LEVEL_THRESHOLDS.findIndex(t => newXP < t);
    if (newLevel > oldLevel) {
      setShowLevelUp(newLevel);
    }

    const updatedProgress: OnboardingProgress = {
      ...progress,
      tasks: updatedTasks,
      totalXP: newXP,
      badges: newBadges,
      currentStreak: progress.currentStreak + 1,
      longestStreak: Math.max(progress.longestStreak, progress.currentStreak + 1),
    };

    // Check if all required completed
    const allRequiredDone = updatedTasks.filter(t => !t.optional).every(t => t.completed);
    if (allRequiredDone && !progress.completedAt) {
      updatedProgress.completedAt = Date.now();
      onAllComplete?.();
    }

    updateLocalProgress(updatedProgress);
    onTaskComplete?.(task);

    // Sync to server
    if (userId) {
      await fetch(`/api/onboarding/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedProgress),
      });
      mutate(updatedProgress);
    }
  }, [progress, currentLevel, userId, updateLocalProgress, onTaskComplete, onAllComplete, mutate]);

  // Handle action
  const handleAction = useCallback((task: OnboardingTask) => {
    if (!task.action) return;
    
    if (task.action.type === 'navigate' && onNavigate) {
      onNavigate(task.action.target);
    } else if (task.action.type === 'tutorial') {
      // Dispatch tutorial event
      window.dispatchEvent(new CustomEvent('start-tutorial', { 
        detail: { tutorialId: task.action.target } 
      }));
    }
  }, [onNavigate]);

  if (!progress) return null;

  return (
    <div className={`bg-zinc-900 rounded-xl border border-zinc-800 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          {/* Progress ring */}
          <ProgressRing progress={completionPercent} size={70} />

          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">
              Primeiros Passos
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {completedCount}/{totalCount} tarefas • {requiredCompleted}/{requiredCount} obrigatórias
            </p>
            
            {/* XP & Level */}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1 text-xs text-violet-400">
                <Zap className="w-3.5 h-3.5" />
                {progress.totalXP.toLocaleString()} XP
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-400">
                <Trophy className="w-3.5 h-3.5" />
                Nível {currentLevel}
              </div>
              {progress.currentStreak > 0 && (
                <div className="flex items-center gap-1 text-xs text-orange-400">
                  <Flame className="w-3.5 h-3.5" />
                  {progress.currentStreak} streak
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors
              ${activeCategory === 'all' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
          >
            Todas
          </button>
          {Object.entries(CATEGORY_INFO).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors
                ${activeCategory === key ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
            >
              <info.icon className="w-3 h-3" />
              {info.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks list */}
      <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
        {filteredTasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            isLocked={isTaskLocked(task)}
            onComplete={handleComplete}
            onAction={handleAction}
          />
        ))}
      </div>

      {/* Footer - all complete */}
      {progress.completedAt && (
        <div className="p-4 border-t border-zinc-800 bg-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-300">
                Onboarding Completo!
              </p>
              <p className="text-xs text-emerald-400/70">
                Você está pronto para criar
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Level up notification */}
      <AnimatePresence>
        {showLevelUp !== null && (
          <LevelUpNotification 
            level={showLevelUp} 
            onClose={() => setShowLevelUp(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default OnboardingChecklist;
