/**
 * Sistema de Onboarding e Tutorial - Aethel Engine
 * 
 * Sistema completo para:
 * - Onboarding de novos usuários
 * - Tours interativos
 * - Tooltips contextuais
 * - Checklists de progresso
 * - Hints e dicas
 * - Gamificação (achievements)
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

import { createElement, createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// ============================================================================
// TIPOS
// ============================================================================

import type {
  Achievement,
  AchievementCategory,
  ChecklistItem,
  OnboardingState,
  OnboardingStep,
  Tour,
  TourStep,
  TourType,
  UserProgress,
} from './onboarding-system.types';
import {
  Achievements,
  OnboardingChecklist,
  Tours,
} from './onboarding-system.content';

export type {
  Achievement,
  AchievementCategory,
  ChecklistItem,
  OnboardingState,
  OnboardingStep,
  Tour,
  TourStep,
  TourType,
  UserProgress,
} from './onboarding-system.types';

export {
  Achievements,
  OnboardingChecklist,
  Tours,
} from './onboarding-system.content';

// ============================================================================
// ONBOARDING MANAGER
// ============================================================================

export class OnboardingManager {
  private static instance: OnboardingManager;
  private progress: Map<string, UserProgress> = new Map();
  
  private constructor() {}
  
  static getInstance(): OnboardingManager {
    if (!OnboardingManager.instance) {
      OnboardingManager.instance = new OnboardingManager();
    }
    return OnboardingManager.instance;
  }
  
  /**
   * Inicializa progresso do usuário
   */
  async initUser(userId: string): Promise<UserProgress> {
    let progress = this.progress.get(userId);
    
    if (!progress) {
      // Tenta carregar do servidor
      try {
        const response = await fetch(`/api/onboarding/${userId}`);
        if (response.ok) {
          progress = await response.json();
        }
      } catch (e) {
        // Ignora erro
      }
      
      if (!progress) {
        progress = this.createDefaultProgress(userId);
      }
      
      this.progress.set(userId, progress);
    }
    
    return progress;
  }
  
  /**
   * Cria progresso padrão
   */
  private createDefaultProgress(userId: string): UserProgress {
    return {
      userId,
      onboarding: {
        userId,
        currentStep: 'welcome',
        completedSteps: [],
        skipped: false,
        startedAt: new Date(),
      },
      completedTours: [],
      achievements: [],
      totalPoints: 0,
      level: 1,
      stats: {
        projectsCreated: 0,
        filesEdited: 0,
        aiPromptsUsed: 0,
        collaborationsJoined: 0,
        buildsCompleted: 0,
        daysActive: 0,
        streak: 0,
      },
      hints: {
        shown: [],
        dismissed: [],
      },
    };
  }
  
  /**
   * Avança para próximo passo do onboarding
   */
  async advanceOnboarding(userId: string): Promise<OnboardingState> {
    const progress = await this.initUser(userId);
    const steps: OnboardingStep[] = [
      'welcome',
      'profile_setup',
      'first_project',
      'explore_editor',
      'try_ai',
      'invite_team',
      'publish_first',
      'completed',
    ];
    
    const currentIndex = steps.indexOf(progress.onboarding.currentStep);
    
    if (currentIndex < steps.length - 1) {
      progress.onboarding.completedSteps.push(progress.onboarding.currentStep);
      progress.onboarding.currentStep = steps[currentIndex + 1];
      
      if (progress.onboarding.currentStep === 'completed') {
        progress.onboarding.completedAt = new Date();
      }
    }
    
    await this.saveProgress(userId, progress);
    
    return progress.onboarding;
  }
  
  /**
   * Pula onboarding
   */
  async skipOnboarding(userId: string): Promise<void> {
    const progress = await this.initUser(userId);
    progress.onboarding.skipped = true;
    progress.onboarding.currentStep = 'completed';
    await this.saveProgress(userId, progress);
  }
  
  /**
   * Marca tour como completo
   */
  async completeTour(userId: string, tourId: TourType): Promise<void> {
    const progress = await this.initUser(userId);
    
    if (!progress.completedTours.includes(tourId)) {
      progress.completedTours.push(tourId);
      
      // Verifica achievements relacionados
      this.checkAchievements(userId, progress, 'tours_completed', progress.completedTours.length);
    }
    
    await this.saveProgress(userId, progress);
  }
  
  /**
   * Incrementa estatística
   */
  async incrementStat(
    userId: string,
    stat: keyof UserProgress['stats'],
    amount: number = 1
  ): Promise<void> {
    const progress = await this.initUser(userId);
    progress.stats[stat] += amount;
    
    // Verifica achievements
    this.checkAchievements(userId, progress, stat, progress.stats[stat]);
    
    await this.saveProgress(userId, progress);
  }
  
  /**
   * Verifica e desbloqueia achievements
   */
  private checkAchievements(
    userId: string,
    progress: UserProgress,
    target: string,
    value: number
  ): Achievement[] {
    const unlocked: Achievement[] = [];
    
    for (const achievement of Achievements) {
      if (progress.achievements.includes(achievement.id)) continue;
      
      let earned = false;
      
      switch (achievement.condition.type) {
        case 'count':
        case 'milestone':
          if (achievement.condition.target === target && value >= achievement.condition.value) {
            earned = true;
          }
          break;
        case 'streak':
          if (achievement.condition.target === target && value >= achievement.condition.value) {
            earned = true;
          }
          break;
      }
      
      if (earned) {
        progress.achievements.push(achievement.id);
        progress.totalPoints += achievement.points;
        unlocked.push(achievement);
        
        // Recalcula level
        progress.level = Math.floor(progress.totalPoints / 500) + 1;
        
        // Dispara evento de achievement
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('aethel:achievement', {
            detail: achievement,
          }));
        }
      }
    }
    
    return unlocked;
  }
  
  /**
   * Mostra hint (se não foi mostrado/dispensado)
   */
  shouldShowHint(userId: string, hintId: string): boolean {
    const progress = this.progress.get(userId);
    if (!progress) return false;
    
    return !progress.hints.shown.includes(hintId) && 
           !progress.hints.dismissed.includes(hintId);
  }
  
  /**
   * Marca hint como mostrado
   */
  async markHintShown(userId: string, hintId: string): Promise<void> {
    const progress = await this.initUser(userId);
    if (!progress.hints.shown.includes(hintId)) {
      progress.hints.shown.push(hintId);
    }
    await this.saveProgress(userId, progress);
  }
  
  /**
   * Dispensa hint permanentemente
   */
  async dismissHint(userId: string, hintId: string): Promise<void> {
    const progress = await this.initUser(userId);
    if (!progress.hints.dismissed.includes(hintId)) {
      progress.hints.dismissed.push(hintId);
    }
    await this.saveProgress(userId, progress);
  }
  
  /**
   * Obtém progresso do usuário
   */
  getProgress(userId: string): UserProgress | undefined {
    return this.progress.get(userId);
  }
  
  /**
   * Salva progresso no servidor
   */
  private async saveProgress(userId: string, progress: UserProgress): Promise<void> {
    this.progress.set(userId, progress);
    
    try {
      await fetch(`/api/onboarding/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progress),
      });
    } catch (e) {
      console.error('[Onboarding] Failed to save progress:', e);
    }
  }
}

// ============================================================================
// REACT CONTEXT E HOOKS
// ============================================================================

interface OnboardingContextType {
  progress: UserProgress | null;
  isLoading: boolean;
  currentTour: Tour | null;
  currentStep: number;
  startTour: (tourId: TourType) => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  advanceOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  incrementStat: (stat: keyof UserProgress['stats'], amount?: number) => Promise<void>;
  checkAchievement: (achievementId: string) => Achievement | null;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ 
  children, 
  userId 
}: { 
  children: ReactNode; 
  userId: string 
}) {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTour, setCurrentTour] = useState<Tour | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  const manager = useMemo(() => OnboardingManager.getInstance(), []);
  
  useEffect(() => {
    manager.initUser(userId).then((p) => {
      setProgress(p);
      setIsLoading(false);
    });
  }, [manager, userId]);
  
  const startTour = useCallback((tourId: TourType) => {
    const tour = Tours[tourId];
    if (tour) {
      setCurrentTour(tour);
      setCurrentStep(0);
    }
  }, []);
  
  const nextStep = useCallback(() => {
    if (currentTour && currentStep < currentTour.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else if (currentTour) {
      manager.completeTour(userId, currentTour.id);
      setCurrentTour(null);
      setCurrentStep(0);
    }
  }, [currentTour, currentStep, manager, userId]);
  
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);
  
  const endTour = useCallback(() => {
    setCurrentTour(null);
    setCurrentStep(0);
  }, []);
  
  const advanceOnboarding = useCallback(async () => {
    await manager.advanceOnboarding(userId);
    setProgress(manager.getProgress(userId) || null);
  }, [manager, userId]);
  
  const skipOnboarding = useCallback(async () => {
    await manager.skipOnboarding(userId);
    setProgress(manager.getProgress(userId) || null);
  }, [manager, userId]);
  
  const incrementStat = useCallback(async (
    stat: keyof UserProgress['stats'],
    amount: number = 1
  ) => {
    await manager.incrementStat(userId, stat, amount);
    setProgress(manager.getProgress(userId) || null);
  }, [manager, userId]);
  
  const checkAchievement = useCallback((achievementId: string): Achievement | null => {
    return Achievements.find(a => a.id === achievementId) || null;
  }, []);
  
  return createElement(
    OnboardingContext.Provider,
    {
      value: {
        progress,
        isLoading,
        currentTour,
        currentStep,
        startTour,
        nextStep,
        prevStep,
        endTour,
        advanceOnboarding,
        skipOnboarding,
        incrementStat,
        checkAchievement,
      },
    },
    children
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const onboardingManager = OnboardingManager.getInstance();

const onboardingSystem = {
  OnboardingManager,
  OnboardingProvider,
  useOnboarding,
  Tours,
  Achievements,
  OnboardingChecklist,
};

export default onboardingSystem;
