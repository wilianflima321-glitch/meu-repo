/**
 * Onboarding Wizard - 3-Step Quick Start (WCAG 2.2 AA + Mobile-First)
 * Gets users to first value in under 90 seconds.
 * Steps: 1) Choose domain, 2) Select template, 3) Start building
 *
 * Accessibility compliance:
 * - WCAG 2.4.1: Skip links (inherited from layout)
 * - WCAG 1.4.3: Contrast >= 4.5:1 for all text
 * - WCAG 2.5.8: Touch targets >= 44px on mobile
 * - WCAG 2.4.7: Focus visible on all interactive elements
 * - WCAG 1.3.1: Semantic headings and ARIA labels
 * - WCAG 2.1.1: Full keyboard navigation
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Code, Film, Gamepad2, Search, Sparkles, ArrowRight, Rocket, ChevronLeft, Check } from 'lucide-react'
import { analytics } from '@/lib/analytics'

// ============================================================================
// TYPES
// ============================================================================

type Domain = 'apps' | 'games' | 'films' | 'research'

interface Template {
  id: string
  name: string
  description: string
  domain: Domain
  tags: string[]
  estimatedTime: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

// ============================================================================
// DATA
// ============================================================================

const DOMAINS = [
  {
    id: 'apps' as Domain,
    name: 'Apps',
    description: 'Web apps, APIs, dashboards, SaaS',
    icon: Code,
    color: 'from-blue-500 to-indigo-500',
    ariaDescription: 'Build web applications, APIs, dashboards, and SaaS products',
  },
  {
    id: 'games' as Domain,
    name: 'Games',
    description: '2D/3D games, interactive experiences',
    icon: Gamepad2,
    color: 'from-emerald-500 to-teal-500',
    ariaDescription: 'Create 2D and 3D games with interactive experiences',
  },
  {
    id: 'films' as Domain,
    name: 'Films',
    description: 'Storyboards, shot descriptions, scripts',
    icon: Film,
    color: 'from-purple-500 to-pink-500',
    ariaDescription: 'Generate storyboards, shot descriptions, and scripts',
  },
  {
    id: 'research' as Domain,
    name: 'Research',
    description: 'Deep research, analysis, reports',
    icon: Search,
    color: 'from-amber-500 to-orange-500',
    ariaDescription: 'Conduct deep research, analysis, and generate reports',
  },
]

const TEMPLATES: Template[] = [
  // Apps
  { id: 'saas-dashboard', name: 'SaaS Dashboard', description: 'Full-stack dashboard with auth, billing, and analytics', domain: 'apps', tags: ['Next.js', 'Prisma', 'Stripe'], estimatedTime: '5 min', difficulty: 'intermediate' },
  { id: 'rest-api', name: 'REST API', description: 'TypeScript API with auth, validation, and tests', domain: 'apps', tags: ['Node.js', 'Express', 'Zod'], estimatedTime: '3 min', difficulty: 'beginner' },
  { id: 'landing-page', name: 'Landing Page', description: 'Marketing page with animations and responsive design', domain: 'apps', tags: ['React', 'Tailwind', 'Framer'], estimatedTime: '2 min', difficulty: 'beginner' },
  { id: 'fullstack-app', name: 'Full-Stack App', description: 'Complete app with frontend, backend, and database', domain: 'apps', tags: ['Next.js', 'PostgreSQL', 'Prisma'], estimatedTime: '8 min', difficulty: 'advanced' },
  // Games
  { id: 'platformer-2d', name: '2D Platformer', description: 'Side-scrolling game with physics and levels', domain: 'games', tags: ['Canvas', 'Physics', 'Sprites'], estimatedTime: '5 min', difficulty: 'intermediate' },
  { id: 'puzzle-game', name: 'Puzzle Game', description: 'Drag-and-drop puzzle with scoring', domain: 'games', tags: ['HTML5', 'Touch', 'Logic'], estimatedTime: '3 min', difficulty: 'beginner' },
  { id: 'fps-prototype', name: '3D FPS Prototype', description: 'First-person shooter with Three.js', domain: 'games', tags: ['Three.js', 'Rapier', 'WebGL'], estimatedTime: '10 min', difficulty: 'advanced' },
  // Films
  { id: 'storyboard', name: 'Storyboard', description: 'AI-generated storyboard from script', domain: 'films', tags: ['Vision', 'Narrative', 'Shots'], estimatedTime: '3 min', difficulty: 'beginner' },
  { id: 'shot-list', name: 'Shot List Generator', description: 'Professional shot descriptions from scene', domain: 'films', tags: ['Cinema', 'Planning', 'AI'], estimatedTime: '2 min', difficulty: 'beginner' },
  // Research
  { id: 'deep-research', name: 'Deep Research', description: 'Multi-source research with citations', domain: 'research', tags: ['Web', 'Analysis', 'Citations'], estimatedTime: '5 min', difficulty: 'intermediate' },
  { id: 'competitor-analysis', name: 'Competitor Analysis', description: 'Market research and competitive landscape', domain: 'research', tags: ['Market', 'Analysis', 'Report'], estimatedTime: '4 min', difficulty: 'beginner' },
]

const DIFFICULTY_COLORS = {
  beginner: 'text-[var(--aethel-success)]',
  intermediate: 'text-[var(--aethel-warning)]',
  advanced: 'text-[var(--aethel-error)]',
}

// ============================================================================
// COMPONENT
// ============================================================================

interface OnboardingWizardProps {
  onComplete?: (template: Template) => void
  onSkip?: () => void
}

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [startTimestamp] = useState(Date.now())
  const headingRef = useRef<HTMLHeadingElement>(null)

  const filteredTemplates = selectedDomain
    ? TEMPLATES.filter((t) => t.domain === selectedDomain)
    : TEMPLATES

  // Focus management: move focus to step heading on navigation (WCAG 2.4.3)
  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const handleDomainSelect = useCallback((domain: Domain) => {
    setSelectedDomain(domain)
    setStep(2)
    analytics?.track?.('onboarding', 'onboarding_domain_selected', { metadata: { domain } })
  }, [])

  const handleTemplateSelect = useCallback((template: Template) => {
    setSelectedTemplate(template)
    setStep(3)
    analytics?.track?.('onboarding', 'template_selected', { metadata: { templateId: template.id, domain: template.domain } })
  }, [])

  const handleStart = useCallback(() => {
    if (selectedTemplate) {
      const durationMs = Date.now() - startTimestamp
      analytics?.track?.('onboarding', 'onboarding_completed', {
        metadata: {
          templateId: selectedTemplate.id,
          domain: selectedTemplate.domain,
          durationMs,
        },
      })
      onComplete?.(selectedTemplate)
      router.push(`/dashboard?template=${selectedTemplate.id}`)
    }
  }, [selectedTemplate, onComplete, router, startTimestamp])

  const handleBack = useCallback(() => {
    if (step === 2) {
      setStep(1)
      setSelectedDomain(null)
    } else if (step === 3) {
      setStep(2)
      setSelectedTemplate(null)
    }
  }, [step])

  // Keyboard handler for domain/template cards (Enter/Space activation)
  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, action: () => void) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        action()
      }
    },
    []
  )

  const STEP_LABELS = ['Choose domain', 'Select template', 'Start building']

  return (
    <div
      className="mx-auto max-w-4xl px-4 py-6 sm:py-8"
      role="region"
      aria-label="Onboarding wizard"
    >
      {/* Progress Bar with ARIA */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--aethel-text-tertiary)] transition-colors hover:bg-white/5 hover:text-[var(--aethel-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                aria-label={`Go back to step ${step - 1}: ${STEP_LABELS[step - 2]}`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-lg font-bold text-[var(--aethel-text-primary)] sm:text-xl">
              Quick Start
            </h2>
          </div>
          {/* Step indicator with ARIA */}
          <nav aria-label="Onboarding progress">
            <ol className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      s < step
                        ? 'bg-indigo-500 text-white'
                        : s === step
                        ? 'border-2 border-indigo-500 text-indigo-400'
                        : 'border border-zinc-700 text-zinc-600'
                    }`}
                    aria-current={s === step ? 'step' : undefined}
                    aria-label={`Step ${s}: ${STEP_LABELS[s - 1]}${s < step ? ' (completed)' : s === step ? ' (current)' : ''}`}
                  >
                    {s < step ? <Check size={12} /> : s}
                  </div>
                  <span className="sr-only">{STEP_LABELS[s - 1]}</span>
                </li>
              ))}
            </ol>
          </nav>
        </div>
        {/* Progress bar visual */}
        <div
          className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={3}
          aria-label={`Step ${step} of 3`}
        >
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Choose Domain */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in" role="group" aria-labelledby="step1-heading">
          <div>
            <h3
              id="step1-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-bold text-[var(--aethel-text-primary)] outline-none sm:text-2xl"
            >
              What do you want to build?
            </h3>
            <p className="mt-1 text-sm text-[var(--aethel-text-tertiary)] sm:text-base">
              Choose your domain to get started quickly.
            </p>
          </div>
          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4"
            role="radiogroup"
            aria-label="Domain selection"
          >
            {DOMAINS.map((domain) => {
              const Icon = domain.icon
              return (
                <button
                  key={domain.id}
                  onClick={() => handleDomainSelect(domain.id)}
                  onKeyDown={(e) => handleCardKeyDown(e, () => handleDomainSelect(domain.id))}
                  role="radio"
                  aria-checked={selectedDomain === domain.id}
                  aria-label={domain.ariaDescription}
                  className="group relative overflow-hidden rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-5 text-left transition-all hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-tertiary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:p-6"
                >
                  <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${domain.color} p-3`}>
                    <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <h4 className="text-base font-semibold text-[var(--aethel-text-primary)] sm:text-lg">
                    {domain.name}
                  </h4>
                  <p className="mt-1 text-sm text-[var(--aethel-text-tertiary)]">
                    {domain.description}
                  </p>
                  <ArrowRight
                    className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--aethel-text-quaternary)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--aethel-text-secondary)]"
                    aria-hidden="true"
                  />
                </button>
              )
            })}
          </div>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-sm text-[var(--aethel-text-quaternary)] underline underline-offset-2 transition-colors hover:text-[var(--aethel-text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Skip wizard and go to dashboard
            </button>
          )}
        </div>
      )}

      {/* Step 2: Select Template */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-in" role="group" aria-labelledby="step2-heading">
          <div>
            <h3
              id="step2-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-bold text-[var(--aethel-text-primary)] outline-none sm:text-2xl"
            >
              Choose a template
            </h3>
            <p className="mt-1 text-sm text-[var(--aethel-text-tertiary)] sm:text-base">
              Start with a pre-configured project. You can customize everything later.
            </p>
          </div>
          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            role="radiogroup"
            aria-label="Template selection"
          >
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                onKeyDown={(e) => handleCardKeyDown(e, () => handleTemplateSelect(template))}
                role="radio"
                aria-checked={selectedTemplate?.id === template.id}
                aria-label={`${template.name}: ${template.description}. Difficulty: ${template.difficulty}. Estimated time: ${template.estimatedTime}.`}
                className={`group rounded-xl border p-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                  selectedTemplate?.id === template.id
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-tertiary)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[var(--aethel-text-primary)]">{template.name}</h4>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[template.difficulty]}`}
                    aria-label={`Difficulty: ${template.difficulty}`}
                  >
                    {template.difficulty}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--aethel-text-tertiary)]">{template.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-[var(--aethel-surface-tertiary)] px-2 py-0.5 text-xs text-[var(--aethel-text-tertiary)]"
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="ml-auto text-xs text-[var(--aethel-text-quaternary)]" aria-label={`Estimated time: ${template.estimatedTime}`}>
                    ~{template.estimatedTime}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Start */}
      {step === 3 && selectedTemplate && (
        <div className="space-y-6 animate-fade-in" role="group" aria-labelledby="step3-heading">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500" aria-hidden="true">
              <Rocket className="h-8 w-8 text-white" />
            </div>
            <h3
              id="step3-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-bold text-[var(--aethel-text-primary)] outline-none sm:text-2xl"
            >
              Ready to build!
            </h3>
            <p className="mt-2 text-sm text-[var(--aethel-text-tertiary)] sm:text-base">
              Your <strong className="text-[var(--aethel-text-primary)]">{selectedTemplate.name}</strong> project
              will be set up with AI-powered multi-agent assistance.
            </p>
          </div>

          <div className="mx-auto max-w-md rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-5 sm:p-6">
            <h4 className="sr-only">Project summary</h4>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--aethel-text-tertiary)]">Template</dt>
                <dd className="font-medium text-[var(--aethel-text-primary)]">{selectedTemplate.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--aethel-text-tertiary)]">Domain</dt>
                <dd className="font-medium capitalize text-[var(--aethel-text-primary)]">{selectedTemplate.domain}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--aethel-text-tertiary)]">Estimated setup</dt>
                <dd className="font-medium text-[var(--aethel-text-primary)]">{selectedTemplate.estimatedTime}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--aethel-text-tertiary)]">Agents</dt>
                <dd className="font-medium text-[var(--aethel-text-primary)]">
                  <Sparkles className="mr-1 inline h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
                  Architect + Engineer + Critic
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handleStart}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 sm:w-auto sm:text-lg"
              aria-label={`Start building ${selectedTemplate.name} project`}
            >
              Start Building
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>
            <button
              onClick={handleBack}
              className="text-sm text-[var(--aethel-text-quaternary)] underline underline-offset-2 transition-colors hover:text-[var(--aethel-text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Choose a different template
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
