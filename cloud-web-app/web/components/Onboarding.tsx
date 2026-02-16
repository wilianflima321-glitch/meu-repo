'use client';

/**
 * Onboarding Components - Aethel Engine
 * 
 * Componentes para:
 * - Tour guiado
 * - Checklist de onboarding
 * - Achievements/badges
 * - Welcome modal
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { X, Check, ChevronRight, Award, Sparkles, Target, Users, Rocket } from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector
  action?: string;
  completed: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt?: Date;
}

interface OnboardingState {
  currentStep: string;
  completedSteps: string[];
  completedTours: string[];
  achievements: string[];
  stats: Record<string, number>;
}

interface DependencyInfo {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'checking';
  required: boolean;
  installCommand?: string;
  installUrl?: string;
  errorMessage?: string;
}

interface SystemHealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  dependencies: DependencyInfo[];
  canRunFullFeatures?: boolean;
  canRunBasicFeatures?: boolean;
  missingRequired?: string[];
  missingOptional?: string[];
}

interface OnboardingContextType {
  state: OnboardingState | null;
  loading: boolean;
  completeStep: (step: string) => Promise<void>;
  completeTour: (tour: string) => Promise<void>;
  skipOnboarding: () => Promise<void>;
  showWelcome: boolean;
  setShowWelcome: (show: boolean) => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const OnboardingContext = createContext<OnboardingContextType>({
  state: null,
  loading: true,
  completeStep: async () => {},
  completeTour: async () => {},
  skipOnboarding: async () => {},
  showWelcome: false,
  setShowWelcome: () => {},
});

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    fetch('/api/onboarding')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setState(data.onboarding);
          // Mostra welcome se for primeiro acesso
          if (data.onboarding.currentStep === 'welcome') {
            setShowWelcome(true);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const completeStep = async (step: string) => {
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_step', step }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.onboarding);
      }
    } catch (error) {
      console.error('Failed to complete step:', error);
    }
  };

  const completeTour = async (tour: string) => {
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_tour', tour }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.onboarding);
      }
    } catch (error) {
      console.error('Failed to complete tour:', error);
    }
  };

  const skipOnboarding = async () => {
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip' }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.onboarding);
        setShowWelcome(false);
      }
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
    }
  };

  return (
    <OnboardingContext.Provider value={{
      state,
      loading,
      completeStep,
      completeTour,
      skipOnboarding,
      showWelcome,
      setShowWelcome,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}

// ============================================================================
// WELCOME MODAL
// ============================================================================

export function WelcomeModal() {
  const { showWelcome, setShowWelcome, completeStep, skipOnboarding } = useOnboarding();
  const [step, setStep] = useState(0);

  const welcomeSteps = [
    {
      title: 'Bem-vindo ao Aethel Engine! 🎮',
      description: 'A plataforma mais avançada para criar jogos. Vamos configurar sua conta e explorar as funcionalidades.',
      icon: <Sparkles className="w-12 h-12 text-blue-400" />,
    },
    {
      title: 'Crie Projetos Incríveis',
      description: 'Use templates prontos ou comece do zero. Nossa IA ajuda você em cada etapa do desenvolvimento.',
      icon: <Rocket className="w-12 h-12 text-blue-400" />,
    },
    {
      title: 'Colabore em Tempo Real',
      description: 'Trabalhe com sua equipe simultaneamente. Veja cursores, edições e chat em tempo real.',
      icon: <Users className="w-12 h-12 text-green-400" />,
    },
    {
      title: 'Publique e Monetize',
      description: 'Exporte para Web, Desktop e Mobile. Venda seus assets no Marketplace.',
      icon: <Target className="w-12 h-12 text-yellow-400" />,
    },
  ];

  if (!showWelcome) return null;

  const currentWelcomeStep = welcomeSteps[step];
  const isLastStep = step === welcomeSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeStep('welcome');
      setShowWelcome(false);
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-lg bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-700 overflow-hidden">
        {/* Header */}
        <div className="relative h-40 bg-gradient-to-br from-blue-600 to-blue-600 flex items-center justify-center">
          {currentWelcomeStep.icon}
          <button
            onClick={skipOnboarding}
            className="absolute top-4 right-4 p-1 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            {currentWelcomeStep.title}
          </h2>
          <p className="text-neutral-300 mb-6">
            {currentWelcomeStep.description}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {welcomeSteps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? 'bg-blue-500' : 'bg-neutral-600'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={skipOnboarding}
              className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
            >
              Pular
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              {isLastStep ? 'Começar' : 'Próximo'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CHECKLIST
// ============================================================================

const CHECKLIST_ITEMS: OnboardingStep[] = [
  {
    id: 'dependency_check',
    title: 'Verificar dependências locais',
    description: 'Blender, Ollama, FFMPEG e ambiente de runtime',
    completed: false,
  },
  {
    id: 'profile_setup',
    title: 'Complete seu perfil',
    description: 'Adicione foto e informações',
    completed: false,
  },
  {
    id: 'first_project',
    title: 'Crie seu primeiro projeto',
    description: 'Comece com um template ou do zero',
    completed: false,
  },
  {
    id: 'explore_editor',
    title: 'Explore o editor',
    description: 'Conheça as ferramentas disponíveis',
    completed: false,
  },
  {
    id: 'try_ai',
    title: 'Use a IA',
    description: 'Peça ajuda ao assistente de IA',
    completed: false,
  },
  {
    id: 'invite_team',
    title: 'Convide sua equipe',
    description: 'Colabore em tempo real',
    completed: false,
  },
  {
    id: 'publish_first',
    title: 'Publique algo',
    description: 'Exporte ou publique no Marketplace',
    completed: false,
  },
];

export function OnboardingChecklist() {
  const { state, completeStep } = useOnboarding();
  const [isOpen, setIsOpen] = useState(true);
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetch('/api/system-health', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`system health failed (${res.status})`);
      }
      const data = (await res.json()) as SystemHealthReport;
      setHealth(data);
    } catch (error) {
      setHealthError(error instanceof Error ? error.message : 'Falha ao checar dependências');
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (!health || !state) return;
    if (health.canRunBasicFeatures && !state.completedSteps.includes('dependency_check')) {
      completeStep('dependency_check');
    }
  }, [health, state, completeStep]);

  if (!state || state.currentStep === 'completed') return null;

  const dependencySummary = (() => {
    if (!health) return 'Aguardando verificação de dependências...';
    const total = health.dependencies?.length || 0;
    const ok = health.dependencies?.filter(dep => dep.status === 'healthy').length || 0;
    const requiredMissing = health.missingRequired?.length || 0;
    if (requiredMissing > 0) {
      return `Faltam ${requiredMissing} dependências críticas`;
    }
    return `${ok}/${total} dependências ok`;
  })();

  const items = CHECKLIST_ITEMS.map(item => {
    if (item.id === 'dependency_check') {
      return {
        ...item,
        description: dependencySummary,
        completed: state.completedSteps.includes(item.id),
      };
    }
    return {
      ...item,
      completed: state.completedSteps.includes(item.id),
    };
  });

  const completedCount = items.filter(i => i.completed).length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {isOpen ? (
        <div className="w-80 bg-neutral-900 rounded-lg shadow-2xl border border-neutral-700 overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600/20 to-blue-600/20 border-b border-neutral-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">Primeiros Passos</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              {completedCount} de {items.length} concluídos
            </div>
          </div>

          {/* Items */}
          <div className="p-2 max-h-64 overflow-y-auto">
            <div className="px-2 pb-3">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Dependências do sistema</span>
                <button
                  onClick={fetchHealth}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {healthLoading ? 'Verificando...' : 'Reverificar'}
                </button>
              </div>
              {healthError && (
                <div className="mt-2 text-xs text-red-400">
                  {healthError}
                </div>
              )}
              {health && (
                <div className="mt-2 space-y-1 text-xs text-neutral-300">
                  <div className="flex items-center justify-between">
                    <span>Status geral</span>
                    <span className={
                      health.overall === 'healthy'
                        ? 'text-green-400'
                        : health.overall === 'degraded'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }>
                      {health.overall}
                    </span>
                  </div>
                  {health.missingRequired && health.missingRequired.length > 0 && (
                    <div className="text-red-400">
                      Críticas: {health.missingRequired.join(', ')}
                    </div>
                  )}
                  {health.missingOptional && health.missingOptional.length > 0 && (
                    <div className="text-neutral-400">
                      Opcionais: {health.missingOptional.join(', ')}
                    </div>
                  )}
                  {health.dependencies && health.dependencies.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {health.dependencies
                        .filter(dep => dep.status === 'unhealthy' || dep.status === 'degraded')
                        .slice(0, 6)
                        .map(dep => (
                          <div key={dep.name} className="text-xs text-neutral-400">
                            <span className={dep.status === 'unhealthy' ? 'text-red-400' : 'text-yellow-400'}>
                              {dep.name}
                            </span>
                            {dep.installCommand && (
                              <span className="text-neutral-500"> · {dep.installCommand}</span>
                            )}
                            {dep.installUrl && !dep.installCommand && (
                              <span className="text-neutral-500"> · {dep.installUrl}</span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => !item.completed && completeStep(item.id)}
                disabled={item.completed}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  item.completed 
                    ? 'opacity-60' 
                    : 'hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.completed 
                      ? 'bg-green-500 border-green-500' 
                      : 'border-neutral-500'
                  }`}>
                    {item.completed && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <div className={`font-medium ${item.completed ? 'text-neutral-500 line-through' : 'text-white'}`}>
                      {item.title}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {item.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Target className="w-4 h-4" />
          {completedCount}/{items.length}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// ACHIEVEMENTS
// ============================================================================

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_project', name: 'Primeiro Projeto', description: 'Criou seu primeiro projeto', icon: '🎮', category: 'beginner' },
  { id: 'ai_master', name: 'Mestre da IA', description: 'Usou a IA 100 vezes', icon: '🤖', category: 'ai' },
  { id: 'collaborator', name: 'Colaborador', description: 'Convidou 5 pessoas', icon: '👥', category: 'social' },
  { id: 'publisher', name: 'Publisher', description: 'Publicou no Marketplace', icon: '🚀', category: 'marketplace' },
  { id: 'week_streak', name: '7 Dias Seguidos', description: 'Acessou por 7 dias', icon: '🔥', category: 'engagement' },
];

export function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-neutral-800 rounded-lg">
      <div className="text-3xl">{achievement.icon}</div>
      <div>
        <div className="font-medium text-white">{achievement.name}</div>
        <div className="text-xs text-neutral-400">{achievement.description}</div>
      </div>
    </div>
  );
}

export function AchievementToast({ achievement, onClose }: { achievement: Achievement; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg shadow-2xl">
        <Award className="w-8 h-8 text-yellow-400" />
        <div>
          <div className="text-xs text-yellow-400 font-medium">Conquista Desbloqueada!</div>
          <div className="text-white font-semibold">{achievement.name}</div>
          <div className="text-sm text-neutral-300">{achievement.description}</div>
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function AchievementsPanel() {
  const { state } = useOnboarding();
  
  if (!state) return null;

  const unlockedIds = state.achievements;
  const achievements = ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: unlockedIds.includes(a.id),
  }));

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-yellow-400" />
        Conquistas
      </h2>
      
      <div className="grid gap-3">
        {achievements.map(achievement => (
          <div 
            key={achievement.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              achievement.unlocked 
                ? 'bg-gradient-to-r from-yellow-600/10 to-orange-600/10 border border-yellow-500/20' 
                : 'bg-neutral-800 opacity-50 grayscale'
            }`}
          >
            <div className="text-2xl">{achievement.icon}</div>
            <div className="flex-1">
              <div className="font-medium text-white">{achievement.name}</div>
              <div className="text-xs text-neutral-400">{achievement.description}</div>
            </div>
            {achievement.unlocked && (
              <Check className="w-5 h-5 text-yellow-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
