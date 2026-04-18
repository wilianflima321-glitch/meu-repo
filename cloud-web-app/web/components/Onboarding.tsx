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
import { X, Check, ChevronRight, Award, Sparkles, Target, Users, Rocket, Layout } from 'lucide-react';

const onboardingSecondaryButtonClass =
  'inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_76%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] transition-colors hover:bg-[var(--aethel-surface-quaternary)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)]';

const onboardingPrimaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-6 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-lg transition-colors hover:bg-[var(--aethel-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)]';

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

export function OnboardingProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setShowWelcome(false);
      return;
    }

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
  }, [enabled]);

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
      console.error('Falha ao concluir etapa:', error);
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
      console.error('Falha ao concluir tour:', error);
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
      console.error('Falha ao pular onboarding:', error);
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
// WELCOME MODAL (Mission-First)
// ============================================================================

export function WelcomeModal({ mission }: { mission?: string }) {
  const { showWelcome, setShowWelcome, completeStep, skipOnboarding } = useOnboarding();
  const [step, setStep] = useState(0);

  // Mission-first onboarding steps
  const welcomeSteps = mission ? [
    {
      title: `Vamos criar: ${mission}`,
      description: 'Seu workspace foi configurado automaticamente. Agora vamos configurar os detalhes específicos do seu projeto.',
      icon: <Sparkles className="w-12 h-12 text-[var(--aethel-primary-light)]" />,
    },
    {
      title: 'Configure sua IA',
      description: 'Escolha seu provider de IA para começar a desenvolver com inteligência artificial integrada.',
      icon: <Target className="w-12 h-12 text-[var(--aethel-info-light)]" />,
    },
    {
      title: 'Explore o IDE',
      description: 'Conheça o Editor, Preview e AI Console. Tudo conectado para desenvolvimento ágil.',
      icon: <Layout className="w-12 h-12 text-[var(--aethel-success-light)]" />,
    },
    {
      title: 'Comece a desenvolver',
      description: 'Seu projeto está pronto. Use o AI Console para gerar código e veja o preview em tempo real.',
      icon: <Rocket className="w-12 h-12 text-[var(--aethel-warning-light)]" />,
    },
  ] : [
    {
      title: 'Bem-vindo ao Aethel Engine',
      description: 'Estúdio focado em Apps e Research com governança rigorosa. Games e Films seguem em roadmap.',
      icon: <Sparkles className="w-12 h-12 text-[var(--aethel-primary-light)]" />,
    },
    {
      title: 'Crie seu primeiro projeto',
      description: 'Escolha um template e defina o objetivo. O sistema cria a base e você valida cada passo.',
      icon: <Rocket className="w-12 h-12 text-[var(--aethel-info-light)]" />,
    },
    {
      title: 'Conecte sua IA',
      description: 'Configure seu provider para respostas reais e rastreáveis. Nada é simulado.',
      icon: <Target className="w-12 h-12 text-[var(--aethel-success-light)]" />,
    },
    {
      title: 'Colabore com sua equipe',
      description: 'Convide colegas, revise mudanças e mantenha rastreabilidade nas entregas.',
      icon: <Users className="w-12 h-12 text-[var(--aethel-warning-light)]" />,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)]">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_95%,transparent)] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="relative h-40 bg-gradient-to-br from-[color-mix(in_srgb,var(--aethel-primary-dark)_90%,transparent)] via-[color-mix(in_srgb,var(--aethel-info)_80%,transparent)] to-[color-mix(in_srgb,var(--aethel-primary)_80%,transparent)] flex items-center justify-center">
          {currentWelcomeStep.icon}
          <button
            type="button"
            onClick={skipOnboarding}
            className="absolute top-4 right-4 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-2 text-[var(--aethel-text-secondary)] transition-colors hover:text-[var(--aethel-text-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--aethel-text-primary)] mb-3">
            {currentWelcomeStep.title}
          </h2>
          <p className="text-[var(--aethel-text-secondary)] mb-6">
            {currentWelcomeStep.description}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {welcomeSteps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
 i === step ? 'bg-[var(--aethel-info)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]'
 }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <button type="button"
              onClick={skipOnboarding}
              className={onboardingSecondaryButtonClass}
              aria-label="Pular onboarding inicial"
            >
              Pular
            </button>
            <button type="button"
              onClick={handleNext}
              className={onboardingPrimaryButtonClass}
              aria-label={isLastStep ? 'Concluir onboarding e comecar' : 'Ir para a proxima etapa do onboarding'}
            >
              {isLastStep ? 'Comecar' : 'Proximo'}
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
    title: 'Checar runtime e integrações',
    description: 'Preview, storage, billing e provedores de IA',
    completed: false,
  },
  {
    id: 'profile_setup',
    title: 'Ajuste seu perfil',
    description: 'Nome, time e preferências do studio',
    completed: false,
  },
  {
    id: 'first_project',
    title: 'Crie seu primeiro projeto',
    description: 'Use um template base para acelerar o fluxo',
    completed: false,
  },
  {
    id: 'explore_editor',
    title: 'Explore o editor',
    description: 'Conheça o IDE, preview e painel de status',
    completed: false,
  },
  {
    id: 'try_ai',
    title: 'Use a IA',
    description: 'Peça uma mudança pequena e valide o resultado',
    completed: false,
  },
  {
    id: 'invite_team',
    title: 'Convide sua equipe',
    description: 'Compartilhe o workspace com o time',
    completed: false,
  },
  {
    id: 'publish_first',
    title: 'Finalize uma entrega',
    description: 'Exportar ou preparar deploy para validar o ciclo',
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

  const healthLabel = (value: SystemHealthReport['overall']) => {
    switch (value) {
      case 'healthy':
        return 'Saudável';
      case 'degraded':
        return 'Parcial';
      case 'unhealthy':
        return 'Indisponível';
      default:
        return 'Desconhecido';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {isOpen ? (
        <div className="w-80 overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_95%,transparent)] shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] to-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] border-b border-[var(--aethel-border-primary)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-[var(--aethel-text-primary)]">Primeiros passos</h3>
              <button type="button"
                aria-label="Set is open"
                onClick={() => setIsOpen(false)}
                className="text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-info)] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-[var(--aethel-text-tertiary)] mt-1">
              {completedCount} de {items.length} concluidos
            </div>
          </div>

          {/* Items */}
          <div className="p-2 max-h-64 overflow-y-auto">
            <div className="px-2 pb-3">
              <div className="flex items-center justify-between text-xs text-[var(--aethel-text-tertiary)]">
                <span>Dependências do sistema</span>
                <button type="button"
                  onClick={fetchHealth}
                  className="text-[var(--aethel-info-light)] hover:text-[var(--aethel-info-light)] transition-colors"
                >
                  {healthLoading ? 'Verificando...' : 'Reverificar'}
                </button>
              </div>
              {healthError && (
                <div className="mt-2 text-xs text-[var(--aethel-error-light)]">
                  {healthError}
                </div>
              )}
              {health && (
                <div className="mt-2 space-y-1 text-xs text-[var(--aethel-text-secondary)]">
                  <div className="flex items-center justify-between">
                    <span>Status geral</span>
                    <span className={
                      health.overall === 'healthy'
                        ? 'text-[var(--aethel-success-light)]'
                        : health.overall === 'degraded'
                        ? 'text-[var(--aethel-warning-light)]'
                        : 'text-[var(--aethel-error-light)]'
                    }>
                      {healthLabel(health.overall)}
                    </span>
                  </div>
                  {health.missingRequired && health.missingRequired.length > 0 && (
                    <div className="text-[var(--aethel-error-light)]">
                      Críticas: {health.missingRequired.join(', ')}
                    </div>
                  )}
                  {health.missingOptional && health.missingOptional.length > 0 && (
                    <div className="text-[var(--aethel-text-tertiary)]">
                      Opcionais: {health.missingOptional.join(', ')}
                    </div>
                  )}
                  {health.dependencies && health.dependencies.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {health.dependencies
                        .filter(dep => dep.status === 'unhealthy' || dep.status === 'degraded')
                        .slice(0, 6)
                        .map(dep => (
                          <div key={dep.name} className="text-xs text-[var(--aethel-text-tertiary)]">
                            <span className={dep.status === 'unhealthy' ? 'text-[var(--aethel-error-light)]' : 'text-[var(--aethel-warning-light)]'}>
                              {dep.name}
                            </span>
                            {dep.installCommand && (
                              <span className="text-[var(--aethel-text-quaternary)]"> - {dep.installCommand}</span>
                            )}
                            {dep.installUrl && !dep.installCommand && (
                              <span className="text-[var(--aethel-text-quaternary)]"> - {dep.installUrl}</span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {items.map(item => (
              <button type="button"
                aria-label="Confirm"
                key={item.id}
                onClick={() => !item.completed && completeStep(item.id)}
                disabled={item.completed}
                className={`w-full p-3 rounded-xl text-left transition-colors ${
 item.completed
 ? 'opacity-60'
 : 'hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]'
 }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
 item.completed
 ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]'
 : 'border-[var(--aethel-border-primary)]'
 }`}>
                    {item.completed && <Check className="w-3 h-3 text-[var(--aethel-text-primary)]" />}
                  </div>
                  <div>
                    <div className={`font-medium ${item.completed ? 'text-[var(--aethel-text-quaternary)] line-through' : 'text-[var(--aethel-text-primary)]'}`}>
                      {item.title}
                    </div>
                    <div className="text-xs text-[var(--aethel-text-tertiary)]">
                      {item.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button type="button"
          onClick={() => setIsOpen(true)}
          className={onboardingPrimaryButtonClass.replace('px-6 py-2 text-sm', 'px-4 py-2 text-xs')}
          aria-label="Abrir checklist de onboarding"
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
  { id: 'first_project', name: 'Primeiro projeto', description: 'Criou o primeiro projeto', icon: 'P1', category: 'beginner' },
  { id: 'ai_master', name: 'Fluxo de IA', description: 'Executou 10 mudanças com IA', icon: 'AI', category: 'ai' },
  { id: 'collaborator', name: 'Colaboração', description: 'Convidou uma pessoa do time', icon: 'TEAM', category: 'social' },
  { id: 'publisher', name: 'Entrega pronta', description: 'Gerou uma entrega válida', icon: 'DEP', category: 'delivery' },
  { id: 'week_streak', name: 'Ritmo semanal', description: 'Ativo por 7 dias', icon: '7D', category: 'engagement' },
];

export function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--aethel-surface-tertiary)] rounded-lg">
      <div className="text-3xl">{achievement.icon}</div>
      <div>
        <div className="font-medium text-[var(--aethel-text-primary)]">{achievement.name}</div>
        <div className="text-xs text-[var(--aethel-text-tertiary)]">{achievement.description}</div>
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
      <div className="flex items-center gap-4 p-4 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--aethel-warning)_18%,transparent),color-mix(in_srgb,var(--aethel-warning-dark)_22%,transparent))] border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] rounded-lg shadow-2xl">
        <Award className="w-8 h-8 text-[var(--aethel-warning-light)]" />
        <div>
          <div className="text-xs text-[var(--aethel-warning-light)] font-medium">Conquista desbloqueada</div>
          <div className="text-[var(--aethel-text-primary)] font-semibold">{achievement.name}</div>
          <div className="text-sm text-[var(--aethel-text-secondary)]">{achievement.description}</div>
        </div>
        <button type="button" onClick={onClose} className="text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]">
          aria-label="Close"
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
      <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)] mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-[var(--aethel-warning-light)]" />
        Conquistas
      </h2>

      <div className="grid gap-3">
        {achievements.map(achievement => (
          <div
            key={achievement.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
 achievement.unlocked
 ? 'bg-[linear-gradient(90deg,color-mix(in_srgb,var(--aethel-warning)_14%,transparent),color-mix(in_srgb,var(--aethel-warning-dark)_18%,transparent))] border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]'
 : 'bg-[var(--aethel-surface-tertiary)] opacity-50 grayscale'
 }`}
          >
            <div className="text-2xl">{achievement.icon}</div>
            <div className="flex-1">
              <div className="font-medium text-[var(--aethel-text-primary)]">{achievement.name}</div>
              <div className="text-xs text-[var(--aethel-text-tertiary)]">{achievement.description}</div>
            </div>
            {achievement.unlocked && (
              <Check className="w-5 h-5 text-[var(--aethel-warning-light)]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
