'use client'

import { motion } from 'framer-motion'
import { 
  FolderOpen, 
  Search, 
  Inbox, 
  FileText, 
  Users, 
  Sparkles,
  Plus,
  ArrowRight,
  Rocket,
  Code2,
  Database,
  Shield,
  Zap
} from 'lucide-react'
import { type ReactNode } from 'react'

import { GlassCard, GradientButton, GlowBadge } from './premium'
import { staggerContainer, staggerItem } from './motion'

// L5 Premium Empty States - Figma Quality
// Beautiful, actionable empty states with illustrations and guidance

interface PremiumEmptyStateProps {
  icon?: ReactNode
  illustration?: 'folder' | 'search' | 'inbox' | 'file' | 'users' | 'code' | 'rocket' | 'database' | 'shield'
  title: string
  description: string
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  suggestions?: string[]
  variant?: 'default' | 'compact' | 'hero'
  badge?: string
}

const illustrationComponents: Record<string, ReactNode> = {
  folder: <FolderOpen className="h-16 w-16" />,
  search: <Search className="h-16 w-16" />,
  inbox: <Inbox className="h-16 w-16" />,
  file: <FileText className="h-16 w-16" />,
  users: <Users className="h-16 w-16" />,
  code: <Code2 className="h-16 w-16" />,
  rocket: <Rocket className="h-16 w-16" />,
  database: <Database className="h-16 w-16" />,
  shield: <Shield className="h-16 w-16" />,
}

export function PremiumEmptyState({
  icon,
  illustration,
  title,
  description,
  primaryAction,
  secondaryAction,
  suggestions,
  variant = 'default',
  badge,
}: PremiumEmptyStateProps) {
  const Illustration = illustration ? illustrationComponents[illustration] : null
  const sizeClasses = {
    compact: 'py-8 px-4',
    default: 'py-16 px-6',
    hero: 'py-24 px-8',
  }

  return (
    <motion.div
      className={`flex flex-col items-center justify-center text-center ${sizeClasses[variant]}`}
      initial="hidden"
      animate="show"
      variants={staggerContainer}
    >
      {/* Illustration */}
      <motion.div
        variants={staggerItem}
        className="relative mb-8"
      >
        {/* Glow background */}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--aethel-primary)]/20 via-[var(--aethel-accent)]/20 to-[var(--aethel-info)]/20 blur-3xl" />
        
        {/* Icon container */}
        <div className="relative rounded-2xl border border-white/[0.1] bg-white/[0.05] backdrop-blur-sm p-6 shadow-2xl shadow-[var(--aethel-primary)]/10">
          <div className="text-[var(--aethel-text-secondary)]">
            {icon || Illustration || <Sparkles className="h-16 w-16" />}
          </div>
          
          {/* Animated sparkles */}
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="h-5 w-5 text-[var(--aethel-primary-light)]" />
          </motion.div>
        </div>
      </motion.div>

      {/* Badge */}
      {badge && (
        <motion.div variants={staggerItem} className="mb-4">
          <GlowBadge color="primary">{badge}</GlowBadge>
        </motion.div>
      )}

      {/* Title */}
      <motion.h3 
        variants={staggerItem}
        className="mb-3 text-2xl font-bold text-[var(--aethel-text-primary)]"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p 
        variants={staggerItem}
        className="mb-8 max-w-md text-base text-[var(--aethel-text-tertiary)] leading-relaxed"
      >
        {description}
      </motion.p>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <motion.div 
          variants={staggerItem}
          className="mb-8 flex flex-wrap items-center justify-center gap-2"
        >
          <span className="text-xs text-[var(--aethel-text-tertiary)]">Sugestões:</span>
          {suggestions.map((suggestion) => (
            <motion.button
              key={suggestion}
              onClick={() => primaryAction?.onClick()}
              className="rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1 text-xs text-[var(--aethel-text-tertiary)] transition-all hover:border-[var(--aethel-primary)]/30 hover:bg-[var(--aethel-primary)]/10 hover:text-[var(--aethel-primary-light)]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {suggestion}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Actions */}
      <motion.div 
        variants={staggerItem}
        className="flex flex-wrap items-center justify-center gap-3"
      >
        {primaryAction && (
          <GradientButton
            onClick={primaryAction.onClick}
            icon={primaryAction.icon || <Plus className="h-4 w-4" />}
          >
            {primaryAction.label}
          </GradientButton>
        )}
        {secondaryAction && (
          <GradientButton
            variant="ghost"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </GradientButton>
        )}
      </motion.div>
    </motion.div>
  )
}

// Specialized Empty States

export function PremiumEmptyProjects({ onCreate }: { onCreate: () => void }) {
  return (
    <GlassCard variant="elevated">
      <PremiumEmptyState
        illustration="folder"
        badge="Primeiros passos"
        title="Nenhum projeto ainda"
        description="Crie seu primeiro projeto para comecar a desenvolver com IA. Templates prontos para SaaS, APIs, jogos e mais."
        primaryAction={{
          label: 'Criar Projeto',
          onClick: onCreate,
          icon: <Plus className="h-4 w-4" />,
        }}
        suggestions={['Dashboard SaaS', 'API REST', 'Jogo 2D', 'Landing Page']}
      />
    </GlassCard>
  )
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <GlassCard variant="default">
      <PremiumEmptyState
        illustration="search"
        variant="compact"
        title="Nenhum resultado encontrado"
        description={`Nao encontramos resultados para "${query}". Tente usar termos diferentes ou verifique a ortografia.`}
        secondaryAction={{
          label: 'Limpar busca',
          onClick: () => window.location.reload(),
        }}
        suggestions={['Remover filtros', 'Buscar mais amplo', 'Verificar ortografia']}
      />
    </GlassCard>
  )
}

export function EmptyChat({ onStart }: { onStart: () => void }) {
  return (
    <GlassCard variant="elevated" className="h-full flex flex-col justify-center">
      <PremiumEmptyState
        illustration="code"
        badge="Conversa IA"
        title="Comece uma conversa"
        description="Pergunte qualquer coisa sobre codigo, arquitetura, ou peca para criar algo novo. Use @mentions para contexto."
        primaryAction={{
          label: 'Iniciar Chat',
          onClick: onStart,
          icon: <ArrowRight className="h-4 w-4" />,
        }}
        suggestions={['@Codebase', '@Docs', 'Explique este erro', 'Refatore este codigo']}
      />
    </GlassCard>
  )
}

export function EmptyWorkflows({ onCreate }: { onCreate: () => void }) {
  return (
    <GlassCard variant="elevated">
      <PremiumEmptyState
        illustration="rocket"
        badge="Automacao"
        title="Nenhum workflow criado"
        description="Workflows ajudam a organizar tarefas complexas com multiplos agentes de IA. Crie fluxos automatizados."
        primaryAction={{
          label: 'Criar Workflow',
          onClick: onCreate,
          icon: <Zap className="h-4 w-4" />,
        }}
        suggestions={['CI/CD Pipeline', 'Code Review', 'Deploy Automatizado']}
      />
    </GlassCard>
  )
}

export function EmptyWallet({ onAddFunds }: { onAddFunds: () => void }) {
  return (
    <GlassCard variant="elevated">
      <PremiumEmptyState
        illustration="shield"
        variant="compact"
        title="Carteira vazia"
        description="Adicione creditos para usar recursos premium e executar workloads de IA. Pagamento seguro via Stripe."
        primaryAction={{
          label: 'Adicionar Creditos',
          onClick: onAddFunds,
          icon: <Plus className="h-4 w-4" />,
        }}
        suggestions={['Ver planos', 'Ver historico', 'Configurar alertas']}
      />
    </GlassCard>
  )
}

export function EmptyNotifications() {
  return (
    <GlassCard variant="default" className="p-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 rounded-xl bg-white/[0.05] p-4 text-[var(--aethel-text-tertiary)]">
          <Inbox className="h-8 w-8" />
        </div>
        <h4 className="text-sm font-medium text-[var(--aethel-text-secondary)]">Sem notificacoes</h4>
        <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
          Novas atualizacoes aparecerao aqui
        </p>
      </div>
    </GlassCard>
  )
}

export function EmptyData({ 
  title = 'Sem dados',
  description = 'Nenhum dado disponivel no momento',
}: { 
  title?: string
  description?: string 
}) {
  return (
    <GlassCard variant="default" className="p-8">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 rounded-xl border border-white/[0.1] bg-white/[0.03] p-4">
          <Database className="h-8 w-8 text-[var(--aethel-text-tertiary)]" />
        </div>
        <h4 className="text-base font-medium text-[var(--aethel-text-secondary)]">{title}</h4>
        <p className="mt-1 text-sm text-[var(--aethel-text-tertiary)]">{description}</p>
      </div>
    </GlassCard>
  )
}

// Error State
interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  onHome?: () => void
}

export function ErrorState({ 
  title = 'Algo deu errado',
  message,
  onRetry,
  onHome 
}: ErrorStateProps) {
  return (
    <motion.div
      className="flex min-h-[400px] flex-col items-center justify-center p-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard variant="elevated" className="max-w-md">
        <div className="flex flex-col items-center text-center">
          {/* Error Icon */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[var(--aethel-error)]/20 blur-2xl" />
            <div className="relative rounded-2xl border border-[var(--aethel-error)]/30 bg-[var(--aethel-error)]/10 p-5">
              <svg className="h-10 w-10 text-[var(--aethel-error-light)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          <h3 className="mb-2 text-xl font-bold text-[var(--aethel-text-primary)]">{title}</h3>
          <p className="mb-6 text-sm text-[var(--aethel-text-tertiary)]">{message}</p>

          <div className="flex gap-3">
            {onRetry && (
              <GradientButton onClick={onRetry}>
                Tentar novamente
              </GradientButton>
            )}
            {onHome && (
              <GradientButton variant="secondary" onClick={onHome}>
                Voltar ao inicio
              </GradientButton>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

// Coming Soon State
interface ComingSoonProps {
  feature: string
  description?: string
  eta?: string
}

export function ComingSoon({ 
  feature, 
  description,
  eta 
}: ComingSoonProps) {
  return (
    <GlassCard variant="elevated" className="p-8">
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-6">
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--aethel-primary)]/30 to-[var(--aethel-info)]/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{ padding: 2 }}
          >
            <div className="h-full w-full rounded-full bg-[var(--aethel-surface-primary)]" />
          </motion.div>
          <div className="relative rounded-full border border-white/[0.1] bg-white/[0.05] p-5">
            <Rocket className="h-10 w-10 text-[var(--aethel-primary-light)]" />
          </div>
        </div>

        <GlowBadge color="primary" className="mb-4">Em breve</GlowBadge>
        
        <h3 className="mb-2 text-xl font-bold text-[var(--aethel-text-primary)]">{feature}</h3>
        <p className="mb-4 max-w-sm text-sm text-[var(--aethel-text-tertiary)]">
          {description || 'Esta funcionalidade esta em desenvolvimento e estara disponivel em uma atualizacao futura.'}
        </p>
        
        {eta && (
          <p className="text-xs text-[var(--aethel-text-tertiary)]">
            Previsao: <span className="text-[var(--aethel-primary-light)]">{eta}</span>
          </p>
        )}
      </div>
    </GlassCard>
  )
}

// First Value Guide - Onboarding helper
interface FirstValueGuideProps {
  steps: {
    title: string
    description: string
    action?: () => void
    actionLabel?: string
    completed?: boolean
  }[]
  currentStep: number
}

export function FirstValueGuide({ steps, currentStep }: FirstValueGuideProps) {
  return (
    <GlassCard variant="elevated" className="p-6">
      <div className="mb-6">
        <GlowBadge color="info" className="mb-2">Primeiros passos</GlowBadge>
        <h3 className="text-lg font-bold text-[var(--aethel-text-primary)]">Guia de inicio rapido</h3>
        <p className="text-sm text-[var(--aethel-text-tertiary)]">Complete estas etapas para aproveitar ao maximo</p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <motion.div
            key={step.title}
            className={`relative flex gap-4 p-4 rounded-xl border ${
              step.completed 
                ? 'border-[var(--aethel-success)]/30 bg-[var(--aethel-success)]/5' 
                : index === currentStep
                ? 'border-[var(--aethel-primary)]/30 bg-[var(--aethel-primary)]/5'
                : 'border-white/[0.06] bg-white/[0.02]'
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Step indicator */}
            <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${
              step.completed
                ? 'bg-[var(--aethel-success)]/20 text-[var(--aethel-success-light)]'
                : index === currentStep
                ? 'bg-[var(--aethel-primary)]/20 text-[var(--aethel-primary-light)]'
                : 'bg-white/[0.05] text-[var(--aethel-text-tertiary)]'
            }`}>
              {step.completed ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>

            <div className="flex-1">
              <h4 className={`text-sm font-medium ${step.completed ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-text-secondary)]'}`}>
                {step.title}
              </h4>
              <p className="mt-0.5 text-xs text-[var(--aethel-text-tertiary)]">{step.description}</p>
              
              {index === currentStep && step.action && (
                <button
                  onClick={step.action}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--aethel-primary-light)] hover:text-[var(--aethel-primary)] transition-colors"
                >
                  {step.actionLabel || 'Comecar'}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  )
}

const premiumEmptyStates = {
  PremiumEmptyState,
  PremiumEmptyProjects,
  EmptySearch,
  EmptyChat,
  EmptyWorkflows,
  EmptyWallet,
  EmptyNotifications,
  EmptyData,
  ErrorState,
  ComingSoon,
  FirstValueGuide,
}

export default premiumEmptyStates
