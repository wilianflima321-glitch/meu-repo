import { logger } from '@/lib/observability/logger';
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

export type OnboardingStep = 
  | 'welcome'
  | 'profile_setup'
  | 'first_project'
  | 'explore_editor'
  | 'try_ai'
  | 'invite_team'
  | 'publish_first'
  | 'completed';

export type TourType = 
  | 'getting_started'
  | 'blueprint_editor'
  | 'level_editor'
  | 'niagara_editor'
  | 'ai_assistant'
  | 'collaboration'
  | 'marketplace'
  | 'billing';

export type AchievementCategory = 
  | 'beginner'
  | 'creator'
  | 'collaborator'
  | 'ai_master'
  | 'publisher'
  | 'community';

export interface OnboardingState {
  userId: string;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skipped: boolean;
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  position?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  action?: {
    type: 'click' | 'input' | 'wait' | 'custom';
    value?: string;
    validator?: () => boolean;
  };
  spotlight?: boolean;
  disableOverlay?: boolean;
  allowClickThrough?: boolean;
  beforeShow?: () => void | Promise<void>;
  afterHide?: () => void | Promise<void>;
}

export interface Tour {
  id: TourType;
  name: string;
  description: string;
  steps: TourStep[];
  prerequisites?: TourType[];
  estimatedTime?: number; // minutos
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  points: number;
  secret?: boolean;
  condition: {
    type: 'count' | 'milestone' | 'streak' | 'combination';
    target: string;
    value: number;
    values?: string[];
  };
  reward?: {
    type: 'badge' | 'feature' | 'discount' | 'tokens';
    value: string | number;
  };
}

export interface UserProgress {
  userId: string;
  onboarding: OnboardingState;
  completedTours: TourType[];
  achievements: string[];
  totalPoints: number;
  level: number;
  stats: {
    projectsCreated: number;
    filesEdited: number;
    aiPromptsUsed: number;
    collaborationsJoined: number;
    buildsCompleted: number;
    daysActive: number;
    streak: number;
  };
  hints: {
    shown: string[];
    dismissed: string[];
  };
}

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

// ============================================================================
// TOURS DEFINIDOS
// ============================================================================

export const Tours: Record<TourType, Tour> = {
  getting_started: {
    id: 'getting_started',
    name: 'Primeiros Passos',
    description: 'Aprenda o básico do Aethel Engine',
    estimatedTime: 5,
    steps: [
      {
        id: 'welcome',
        target: '[data-tour="dashboard"]',
        title: 'Bem-vindo ao Aethel Engine! 🎮',
        content: 'Este é seu dashboard principal. Aqui você pode ver seus projetos, atividades recentes e acessar todas as ferramentas.',
        position: 'center',
        spotlight: true,
      },
      {
        id: 'sidebar',
        target: '[data-tour="sidebar"]',
        title: 'Menu de Navegação',
        content: 'Use este menu para navegar entre projetos, marketplace, configurações e mais.',
        position: 'right',
      },
      {
        id: 'new_project',
        target: '[data-tour="new-project"]',
        title: 'Criar Novo Projeto',
        content: 'Clique aqui para criar seu primeiro projeto. Você pode escolher entre templates ou começar do zero.',
        position: 'bottom',
        action: {
          type: 'click',
        },
      },
      {
        id: 'ai_assistant',
        target: '[data-tour="ai-assistant"]',
        title: 'Assistente AI 🤖',
        content: 'Nosso assistente AI pode ajudar você a criar código, assets e resolver problemas. Experimente!',
        position: 'left',
      },
      {
        id: 'complete',
        target: '[data-tour="dashboard"]',
        title: 'Pronto para Começar!',
        content: 'Você completou o tour básico. Explore o editor e crie algo incrível!',
        position: 'center',
      },
    ],
  },
  
  blueprint_editor: {
    id: 'blueprint_editor',
    name: 'Editor de Blueprints',
    description: 'Aprenda a criar lógica visual com Blueprints',
    estimatedTime: 10,
    prerequisites: ['getting_started'],
    steps: [
      {
        id: 'canvas',
        target: '[data-tour="bp-canvas"]',
        title: 'Canvas de Blueprints',
        content: 'Este é seu canvas de trabalho. Arraste e conecte nós para criar lógica de jogo.',
        position: 'center',
      },
      {
        id: 'node_palette',
        target: '[data-tour="bp-palette"]',
        title: 'Paleta de Nós',
        content: 'Encontre todos os nós disponíveis aqui. Use a busca para encontrar rapidamente o que precisa.',
        position: 'left',
      },
      {
        id: 'add_node',
        target: '[data-tour="bp-canvas"]',
        title: 'Adicionar Nó',
        content: 'Clique com botão direito no canvas para abrir o menu de nós. Tente adicionar um nó "Print String".',
        position: 'center',
        action: {
          type: 'custom',
          validator: () => document.querySelectorAll('[data-node-type="print"]').length > 0,
        },
      },
      {
        id: 'connect_nodes',
        target: '[data-tour="bp-canvas"]',
        title: 'Conectar Nós',
        content: 'Arraste de uma saída para uma entrada para conectar nós. As cores indicam tipos compatíveis.',
        position: 'center',
      },
      {
        id: 'properties',
        target: '[data-tour="bp-properties"]',
        title: 'Painel de Propriedades',
        content: 'Selecione um nó para ver e editar suas propriedades aqui.',
        position: 'left',
      },
      {
        id: 'compile',
        target: '[data-tour="bp-compile"]',
        title: 'Compilar Blueprint',
        content: 'Clique em Compilar para verificar erros e preparar seu Blueprint para execução.',
        position: 'bottom',
      },
    ],
  },
  
  level_editor: {
    id: 'level_editor',
    name: 'Editor de Níveis',
    description: 'Crie mundos 3D incríveis',
    estimatedTime: 15,
    prerequisites: ['getting_started'],
    steps: [
      {
        id: 'viewport',
        target: '[data-tour="level-viewport"]',
        title: 'Viewport 3D',
        content: 'Este é seu viewport 3D. Use WASD para mover, botão direito para rotacionar a câmera.',
        position: 'center',
      },
      {
        id: 'hierarchy',
        target: '[data-tour="level-hierarchy"]',
        title: 'Hierarquia de Objetos',
        content: 'Todos os objetos da cena aparecem aqui. Você pode organizar em pastas e parenting.',
        position: 'right',
      },
      {
        id: 'tools',
        target: '[data-tour="level-tools"]',
        title: 'Ferramentas de Transformação',
        content: 'W = Mover, E = Rotacionar, R = Escalar. Use esses atalhos para manipular objetos.',
        position: 'top',
      },
      {
        id: 'add_object',
        target: '[data-tour="level-add"]',
        title: 'Adicionar Objetos',
        content: 'Adicione primitivas, luzes, câmeras e outros objetos ao seu nível.',
        position: 'bottom',
      },
      {
        id: 'terrain',
        target: '[data-tour="level-terrain"]',
        title: 'Edição de Terreno',
        content: 'Crie e esculpa terrenos realistas com nossas ferramentas de paisagem.',
        position: 'right',
      },
    ],
  },
  
  niagara_editor: {
    id: 'niagara_editor',
    name: 'Editor Niagara VFX',
    description: 'Crie efeitos visuais impressionantes',
    estimatedTime: 12,
    prerequisites: ['getting_started'],
    steps: [
      {
        id: 'system_overview',
        target: '[data-tour="niagara-overview"]',
        title: 'Visão Geral do Sistema',
        content: 'Um sistema Niagara é composto por emissores que geram partículas com comportamentos específicos.',
        position: 'center',
      },
      {
        id: 'emitters',
        target: '[data-tour="niagara-emitters"]',
        title: 'Emissores',
        content: 'Cada emissor controla como as partículas são geradas, movidas e renderizadas.',
        position: 'right',
      },
      {
        id: 'modules',
        target: '[data-tour="niagara-modules"]',
        title: 'Módulos',
        content: 'Módulos são blocos de comportamento que você empilha para criar efeitos complexos.',
        position: 'left',
      },
      {
        id: 'preview',
        target: '[data-tour="niagara-preview"]',
        title: 'Preview em Tempo Real',
        content: 'Veja suas mudanças instantaneamente neste preview. Ajuste parâmetros e veja o resultado.',
        position: 'bottom',
      },
      {
        id: 'curves',
        target: '[data-tour="niagara-curves"]',
        title: 'Editor de Curvas',
        content: 'Use curvas para controlar valores ao longo do tempo, como tamanho e cor das partículas.',
        position: 'top',
      },
    ],
  },
  
  ai_assistant: {
    id: 'ai_assistant',
    name: 'Assistente AI',
    description: 'Aprenda a usar a IA para acelerar seu desenvolvimento',
    estimatedTime: 8,
    steps: [
      {
        id: 'chat',
        target: '[data-tour="ai-chat"]',
        title: 'Chat com IA',
        content: 'Converse com nossa IA para obter ajuda, gerar código, criar assets e muito mais.',
        position: 'left',
      },
      {
        id: 'prompts',
        target: '[data-tour="ai-prompts"]',
        title: 'Prompts Sugeridos',
        content: 'Use esses prompts prontos para tarefas comuns ou personalize seus próprios.',
        position: 'top',
      },
      {
        id: 'code_gen',
        target: '[data-tour="ai-code"]',
        title: 'Geração de Código',
        content: 'Peça à IA para gerar scripts, blueprints e lógica de jogo.',
        position: 'right',
      },
      {
        id: 'context',
        target: '[data-tour="ai-context"]',
        title: 'Contexto do Projeto',
        content: 'A IA entende seu projeto e pode fazer sugestões relevantes baseadas no seu código.',
        position: 'bottom',
      },
    ],
  },
  
  collaboration: {
    id: 'collaboration',
    name: 'Colaboração',
    description: 'Trabalhe em equipe no Aethel Engine',
    estimatedTime: 6,
    steps: [
      {
        id: 'invite',
        target: '[data-tour="collab-invite"]',
        title: 'Convidar Colaboradores',
        content: 'Convide membros da sua equipe por email. Eles receberão um link para participar.',
        position: 'bottom',
      },
      {
        id: 'presence',
        target: '[data-tour="collab-presence"]',
        title: 'Presença em Tempo Real',
        content: 'Veja quem está online e em qual arquivo estão trabalhando.',
        position: 'left',
      },
      {
        id: 'cursors',
        target: '[data-tour="collab-cursors"]',
        title: 'Cursores Compartilhados',
        content: 'Veja os cursores dos colaboradores em tempo real no editor.',
        position: 'center',
      },
      {
        id: 'comments',
        target: '[data-tour="collab-comments"]',
        title: 'Comentários',
        content: 'Deixe comentários no código ou em objetos da cena para feedback da equipe.',
        position: 'right',
      },
    ],
  },
  
  marketplace: {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Explore e publique no Marketplace',
    estimatedTime: 5,
    steps: [
      {
        id: 'browse',
        target: '[data-tour="mp-browse"]',
        title: 'Explorar Assets',
        content: 'Navegue por milhares de assets, templates e plugins criados pela comunidade.',
        position: 'center',
      },
      {
        id: 'search',
        target: '[data-tour="mp-search"]',
        title: 'Busca Avançada',
        content: 'Use filtros para encontrar exatamente o que precisa.',
        position: 'bottom',
      },
      {
        id: 'publish',
        target: '[data-tour="mp-publish"]',
        title: 'Publicar Seus Assets',
        content: 'Compartilhe suas criações e até monetize vendendo no marketplace.',
        position: 'left',
      },
    ],
  },
  
  billing: {
    id: 'billing',
    name: 'Planos e Pagamento',
    description: 'Entenda os planos e como fazer upgrade',
    estimatedTime: 3,
    steps: [
      {
        id: 'plans',
        target: '[data-tour="billing-plans"]',
        title: 'Planos Disponíveis',
        content: 'Compare os planos e escolha o melhor para suas necessidades.',
        position: 'center',
      },
      {
        id: 'usage',
        target: '[data-tour="billing-usage"]',
        title: 'Uso Atual',
        content: 'Acompanhe seu uso de recursos, storage e tokens AI.',
        position: 'right',
      },
      {
        id: 'upgrade',
        target: '[data-tour="billing-upgrade"]',
        title: 'Fazer Upgrade',
        content: 'Atualize seu plano a qualquer momento. O valor é proporcional.',
        position: 'bottom',
      },
    ],
  },
};

// ============================================================================
// ACHIEVEMENTS DEFINIDOS
// ============================================================================

export const Achievements: Achievement[] = [
  // Beginner
  {
    id: 'first_login',
    name: 'Bem-vindo!',
    description: 'Fez login pela primeira vez',
    icon: '👋',
    category: 'beginner',
    points: 10,
    condition: { type: 'milestone', target: 'login', value: 1 },
  },
  {
    id: 'profile_complete',
    name: 'Identidade Definida',
    description: 'Completou seu perfil',
    icon: '👤',
    category: 'beginner',
    points: 20,
    condition: { type: 'milestone', target: 'profile_complete', value: 1 },
  },
  {
    id: 'first_project',
    name: 'Criador Iniciante',
    description: 'Criou seu primeiro projeto',
    icon: '🎮',
    category: 'beginner',
    points: 50,
    condition: { type: 'count', target: 'projects_created', value: 1 },
  },
  {
    id: 'first_tour',
    name: 'Estudante Dedicado',
    description: 'Completou seu primeiro tour',
    icon: '📚',
    category: 'beginner',
    points: 30,
    condition: { type: 'count', target: 'tours_completed', value: 1 },
  },
  
  // Creator
  {
    id: 'five_projects',
    name: 'Criador Prolífico',
    description: 'Criou 5 projetos',
    icon: '🎯',
    category: 'creator',
    points: 100,
    condition: { type: 'count', target: 'projects_created', value: 5 },
  },
  {
    id: 'first_blueprint',
    name: 'Arquiteto de Lógica',
    description: 'Criou seu primeiro Blueprint',
    icon: '🔷',
    category: 'creator',
    points: 50,
    condition: { type: 'count', target: 'blueprints_created', value: 1 },
  },
  {
    id: 'first_vfx',
    name: 'Mestre dos Efeitos',
    description: 'Criou seu primeiro efeito VFX',
    icon: '✨',
    category: 'creator',
    points: 50,
    condition: { type: 'count', target: 'vfx_created', value: 1 },
  },
  {
    id: 'first_build',
    name: 'Construtor',
    description: 'Fez seu primeiro build',
    icon: '🏗️',
    category: 'creator',
    points: 75,
    condition: { type: 'count', target: 'builds_completed', value: 1 },
  },
  {
    id: 'hundred_files',
    name: 'Trabalhador Incansável',
    description: 'Editou 100 arquivos',
    icon: '📝',
    category: 'creator',
    points: 150,
    condition: { type: 'count', target: 'files_edited', value: 100 },
  },
  
  // AI Master
  {
    id: 'first_ai',
    name: 'Aprendiz de IA',
    description: 'Usou o assistente AI pela primeira vez',
    icon: '🤖',
    category: 'ai_master',
    points: 30,
    condition: { type: 'count', target: 'ai_prompts', value: 1 },
  },
  {
    id: 'ai_power_user',
    name: 'Mestre da IA',
    description: 'Usou 100 prompts de IA',
    icon: '🧠',
    category: 'ai_master',
    points: 200,
    condition: { type: 'count', target: 'ai_prompts', value: 100 },
  },
  {
    id: 'ai_code_gen',
    name: 'Gerador de Código',
    description: 'Gerou código com IA 50 vezes',
    icon: '💻',
    category: 'ai_master',
    points: 100,
    condition: { type: 'count', target: 'ai_code_generated', value: 50 },
  },
  
  // Collaborator
  {
    id: 'first_collab',
    name: 'Trabalho em Equipe',
    description: 'Convidou alguém para colaborar',
    icon: '👥',
    category: 'collaborator',
    points: 50,
    condition: { type: 'count', target: 'invites_sent', value: 1 },
  },
  {
    id: 'team_player',
    name: 'Jogador de Equipe',
    description: 'Colaborou em 5 projetos',
    icon: '🤝',
    category: 'collaborator',
    points: 100,
    condition: { type: 'count', target: 'collaborations', value: 5 },
  },
  {
    id: 'feedback_giver',
    name: 'Crítico Construtivo',
    description: 'Deixou 20 comentários em projetos',
    icon: '💬',
    category: 'collaborator',
    points: 75,
    condition: { type: 'count', target: 'comments_left', value: 20 },
  },
  
  // Publisher
  {
    id: 'first_publish',
    name: 'Publicador',
    description: 'Publicou seu primeiro item no Marketplace',
    icon: '🚀',
    category: 'publisher',
    points: 100,
    condition: { type: 'count', target: 'marketplace_items', value: 1 },
  },
  {
    id: 'popular_creator',
    name: 'Criador Popular',
    description: 'Recebeu 100 downloads em seus itens',
    icon: '⭐',
    category: 'publisher',
    points: 200,
    condition: { type: 'count', target: 'total_downloads', value: 100 },
  },
  
  // Community
  {
    id: 'week_streak',
    name: 'Consistência',
    description: 'Usou o Aethel por 7 dias seguidos',
    icon: '🔥',
    category: 'community',
    points: 100,
    condition: { type: 'streak', target: 'daily_login', value: 7 },
  },
  {
    id: 'month_streak',
    name: 'Dedicação Total',
    description: 'Usou o Aethel por 30 dias seguidos',
    icon: '💎',
    category: 'community',
    points: 500,
    condition: { type: 'streak', target: 'daily_login', value: 30 },
  },
  
  // Secret
  {
    id: 'easter_egg',
    name: '???',
    description: 'Encontrou um easter egg!',
    icon: '🥚',
    category: 'community',
    points: 50,
    secret: true,
    condition: { type: 'milestone', target: 'easter_egg', value: 1 },
  },
];

// ============================================================================
// ONBOARDING CHECKLIST
// ============================================================================

export const OnboardingChecklist: ChecklistItem[] = [
  {
    id: 'verify_email',
    title: 'Verificar Email',
    description: 'Confirme seu endereço de email',
    completed: false,
  },
  {
    id: 'complete_profile',
    title: 'Completar Perfil',
    description: 'Adicione foto e informações básicas',
    completed: false,
    action: {
      label: 'Ir para Perfil',
      href: '/settings/profile',
    },
  },
  {
    id: 'create_project',
    title: 'Criar Primeiro Projeto',
    description: 'Comece sua jornada criativa',
    completed: false,
    action: {
      label: 'Novo Projeto',
      href: '/projects/new',
    },
  },
  {
    id: 'complete_tour',
    title: 'Completar Tour Inicial',
    description: 'Aprenda o básico do Aethel Engine',
    completed: false,
    action: {
      label: 'Iniciar Tour',
    },
  },
  {
    id: 'try_ai',
    title: 'Experimentar Assistente AI',
    description: 'Use a IA para criar algo',
    completed: false,
    action: {
      label: 'Abrir AI',
      href: '/ai-assistant',
    },
  },
  {
    id: 'explore_marketplace',
    title: 'Explorar Marketplace',
    description: 'Descubra assets da comunidade',
    completed: false,
    action: {
      label: 'Ver Marketplace',
      href: '/marketplace',
    },
  },
];

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
      logger.error('[Onboarding] Failed to save progress:', e);
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
