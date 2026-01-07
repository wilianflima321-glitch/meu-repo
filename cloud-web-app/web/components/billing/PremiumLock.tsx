/**
 * PremiumLock Component - Paywall para Features Premium
 * 
 * Wrapper que bloqueia conteúdo e exibe CTA de upgrade quando
 * o usuário não tem acesso a uma feature específica.
 * 
 * Uso:
 * <PremiumLock feature="agents" plan="pro">
 *   <AIAgentPanel />
 * </PremiumLock>
 * 
 * Se o usuário não tiver o plano necessário, mostra overlay com:
 * - Descrição da feature
 * - Benefícios do upgrade
 * - CTA para página de pricing
 */

'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { Lock, Sparkles, ArrowRight, X, Crown, Zap, Shield, Rocket } from 'lucide-react';
import useSWR from 'swr';

// ============================================================================
// TIPOS
// ============================================================================

export type FeatureKey =
  | 'agents'
  | 'collaboration'
  | 'git'
  | 'terminal'
  | 'debugger'
  | 'build'
  | 'export'
  | 'api'
  | 'priority-support'
  | 'custom-models'
  | 'advanced-analytics'
  | 'team-management'
  | 'white-label';

export type PlanId = 'starter' | 'basic' | 'pro' | 'studio' | 'enterprise';

interface PremiumLockProps {
  /** Feature que requer acesso premium */
  feature: FeatureKey;
  /** Plano mínimo necessário para acessar */
  requiredPlan?: PlanId;
  /** Conteúdo a ser renderizado se tiver acesso */
  children: ReactNode;
  /** Esconde completamente ao invés de mostrar blur */
  hideCompletely?: boolean;
  /** Classe CSS customizada */
  className?: string;
  /** Callback quando usuário clica em upgrade */
  onUpgradeClick?: () => void;
}

// ============================================================================
// FEATURE METADATA
// ============================================================================

const FEATURE_INFO: Record<FeatureKey, {
  name: string;
  description: string;
  benefits: string[];
  icon: React.ReactNode;
  minPlan: PlanId;
}> = {
  agents: {
    name: 'AI Agents',
    description: 'Agentes inteligentes que trabalham autonomamente no seu projeto',
    benefits: [
      'Geração automática de código',
      'Refatoração inteligente',
      'Criação de assets com IA',
    ],
    icon: <Sparkles className="w-6 h-6" />,
    minPlan: 'pro',
  },
  collaboration: {
    name: 'Colaboração em Tempo Real',
    description: 'Trabalhe com sua equipe no mesmo projeto simultaneamente',
    benefits: [
      'Edição colaborativa',
      'Chat de equipe',
      'Controle de versão integrado',
    ],
    icon: <Crown className="w-6 h-6" />,
    minPlan: 'pro',
  },
  git: {
    name: 'Git Integration',
    description: 'Controle de versão completo integrado ao editor',
    benefits: [
      'Commits, branches, merges',
      'GitHub/GitLab integration',
      'Visual diff editor',
    ],
    icon: <Shield className="w-6 h-6" />,
    minPlan: 'basic',
  },
  terminal: {
    name: 'Terminal Integrado',
    description: 'Terminal completo para comandos e scripts',
    benefits: [
      'Múltiplas sessões',
      'Scripts automatizados',
      'Integração com build system',
    ],
    icon: <Zap className="w-6 h-6" />,
    minPlan: 'basic',
  },
  debugger: {
    name: 'Debugger Avançado',
    description: 'Debug visual com breakpoints e inspeção de variáveis',
    benefits: [
      'Breakpoints condicionais',
      'Watch expressions',
      'Call stack navigation',
    ],
    icon: <Zap className="w-6 h-6" />,
    minPlan: 'basic',
  },
  build: {
    name: 'Cloud Builds',
    description: 'Compile e exporte seu projeto na nuvem',
    benefits: [
      'Build para múltiplas plataformas',
      'Deploy automático',
      'CI/CD integrado',
    ],
    icon: <Rocket className="w-6 h-6" />,
    minPlan: 'pro',
  },
  export: {
    name: 'Export Premium',
    description: 'Exporte em formatos profissionais',
    benefits: [
      'Export sem marca d\'água',
      'Formatos AAA (4K, HDR)',
      'Pacotes otimizados',
    ],
    icon: <ArrowRight className="w-6 h-6" />,
    minPlan: 'pro',
  },
  api: {
    name: 'API Access',
    description: 'Acesso programático via REST API',
    benefits: [
      'Automação de workflows',
      'Integração com pipelines',
      'Webhooks',
    ],
    icon: <Zap className="w-6 h-6" />,
    minPlan: 'studio',
  },
  'priority-support': {
    name: 'Suporte Prioritário',
    description: 'Atendimento dedicado com SLA',
    benefits: [
      'Resposta em até 4h',
      'Canal exclusivo',
      'Onboarding personalizado',
    ],
    icon: <Shield className="w-6 h-6" />,
    minPlan: 'studio',
  },
  'custom-models': {
    name: 'Modelos Customizados',
    description: 'Treine modelos de IA com seus próprios dados',
    benefits: [
      'Fine-tuning de modelos',
      'Estilo artístico próprio',
      'Assets personalizados',
    ],
    icon: <Sparkles className="w-6 h-6" />,
    minPlan: 'enterprise',
  },
  'advanced-analytics': {
    name: 'Analytics Avançado',
    description: 'Métricas detalhadas de uso e performance',
    benefits: [
      'Dashboards customizados',
      'Exportação de relatórios',
      'Insights de produtividade',
    ],
    icon: <Crown className="w-6 h-6" />,
    minPlan: 'studio',
  },
  'team-management': {
    name: 'Gestão de Equipe',
    description: 'Controle de acesso e permissões avançadas',
    benefits: [
      'Roles customizados',
      'Audit logs',
      'SSO/SAML',
    ],
    icon: <Crown className="w-6 h-6" />,
    minPlan: 'studio',
  },
  'white-label': {
    name: 'White Label',
    description: 'Remova branding Aethel e use sua marca',
    benefits: [
      'Logo customizado',
      'Domínio próprio',
      'Cores da marca',
    ],
    icon: <Shield className="w-6 h-6" />,
    minPlan: 'enterprise',
  },
};

// Plan hierarchy for comparison
const PLAN_HIERARCHY: Record<PlanId, number> = {
  starter: 0,
  basic: 1,
  pro: 2,
  studio: 3,
  enterprise: 4,
};

const PLAN_NAMES: Record<PlanId, string> = {
  starter: 'Starter',
  basic: 'Basic',
  pro: 'Pro',
  studio: 'Studio',
  enterprise: 'Enterprise',
};

const PLAN_PRICES: Record<PlanId, string> = {
  starter: '$3/mês',
  basic: '$9/mês',
  pro: '$29/mês',
  studio: '$79/mês',
  enterprise: 'Personalizado',
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function PremiumLock({
  feature,
  requiredPlan,
  children,
  hideCompletely = false,
  className = '',
  onUpgradeClick,
}: PremiumLockProps) {
  const [showModal, setShowModal] = useState(false);
  
  // Fetch user's current plan
  const { data: userData } = useSWR<{ plan: string }>('/api/auth/me', fetcher);
  const userPlan = (userData?.plan?.replace('_trial', '') || 'starter') as PlanId;

  const featureInfo = FEATURE_INFO[feature];
  const minPlan = requiredPlan || featureInfo.minPlan;

  // Check if user has access
  const hasAccess = PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[minPlan];

  // If user has access, render children normally
  if (hasAccess) {
    return <>{children}</>;
  }

  // If hideCompletely, don't render anything
  if (hideCompletely) {
    return null;
  }

  const handleUpgradeClick = () => {
    onUpgradeClick?.();
    setShowModal(false);
    window.location.href = '/pricing?upgrade=' + minPlan;
  };

  return (
    <div className={`premium-lock-container ${className}`}>
      {/* Blurred content preview */}
      <div className="premium-lock-content" aria-hidden="true">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="premium-lock-overlay" onClick={() => setShowModal(true)}>
        <div className="premium-lock-badge">
          <Lock className="w-5 h-5" />
          <span>Recurso {PLAN_NAMES[minPlan]}+</span>
        </div>
        <button className="premium-lock-cta">
          Ver como desbloquear
        </button>
      </div>

      {/* Upgrade modal */}
      {showModal && (
        <div className="premium-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
            <button className="premium-modal-close" onClick={() => setShowModal(false)}>
              <X className="w-5 h-5" />
            </button>

            <div className="premium-modal-icon">
              {featureInfo.icon}
            </div>

            <h2 className="premium-modal-title">{featureInfo.name}</h2>
            <p className="premium-modal-description">{featureInfo.description}</p>

            <div className="premium-modal-benefits">
              <h3>O que você ganha:</h3>
              <ul>
                {featureInfo.benefits.map((benefit, i) => (
                  <li key={i}>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="premium-modal-plan">
              <div className="premium-modal-plan-badge">
                <Crown className="w-4 h-4" />
                <span>Disponível no {PLAN_NAMES[minPlan]}</span>
              </div>
              <div className="premium-modal-plan-price">
                {PLAN_PRICES[minPlan]}
              </div>
            </div>

            <button className="premium-modal-upgrade" onClick={handleUpgradeClick}>
              Fazer Upgrade
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="premium-modal-note">
              Você está no plano {PLAN_NAMES[userPlan]}
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        .premium-lock-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .premium-lock-content {
          filter: blur(8px);
          pointer-events: none;
          user-select: none;
          opacity: 0.5;
        }

        .premium-lock-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: linear-gradient(
            135deg,
            rgba(0, 0, 0, 0.6) 0%,
            rgba(0, 0, 0, 0.8) 100%
          );
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .premium-lock-overlay:hover {
          background: linear-gradient(
            135deg,
            rgba(0, 0, 0, 0.5) 0%,
            rgba(0, 0, 0, 0.7) 100%
          );
        }

        .premium-lock-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 9999px;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .premium-lock-cta {
          padding: 12px 24px;
          background: white;
          color: #18181b;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .premium-lock-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        /* Modal styles */
        .premium-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 16px;
        }

        .premium-modal {
          position: relative;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 16px;
          padding: 32px;
          max-width: 420px;
          width: 100%;
          text-align: center;
        }

        .premium-modal-close {
          position: absolute;
          top: 12px;
          right: 12px;
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 4px;
        }

        .premium-modal-close:hover {
          color: white;
        }

        .premium-modal-icon {
          display: inline-flex;
          padding: 16px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 16px;
          color: white;
          margin-bottom: 16px;
        }

        .premium-modal-title {
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin: 0 0 8px 0;
        }

        .premium-modal-description {
          font-size: 14px;
          color: #a1a1aa;
          margin: 0 0 24px 0;
        }

        .premium-modal-benefits {
          text-align: left;
          margin-bottom: 24px;
        }

        .premium-modal-benefits h3 {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #71717a;
          margin: 0 0 12px 0;
        }

        .premium-modal-benefits ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .premium-modal-benefits li {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          color: #e4e4e7;
          font-size: 14px;
        }

        .premium-modal-plan {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #27272a;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .premium-modal-plan-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #f59e0b;
          font-size: 14px;
          font-weight: 600;
        }

        .premium-modal-plan-price {
          font-size: 18px;
          font-weight: 700;
          color: white;
        }

        .premium-modal-upgrade {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .premium-modal-upgrade:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
        }

        .premium-modal-note {
          font-size: 12px;
          color: #71717a;
          margin: 16px 0 0 0;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { FEATURE_INFO, PLAN_HIERARCHY, PLAN_NAMES, PLAN_PRICES };
