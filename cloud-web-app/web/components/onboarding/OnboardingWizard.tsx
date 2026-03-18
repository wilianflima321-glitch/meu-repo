/**
 * Onboarding Wizard - 3-Step Quick Start
 * Gets users to first value in under 90 seconds.
 * Steps: 1) Choose domain, 2) Select template, 3) Start building
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Code, Film, Gamepad2, Search, Sparkles, ArrowRight, Rocket, ChevronLeft } from 'lucide-react'
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
  },
  {
    id: 'games' as Domain,
    name: 'Games',
    description: '2D/3D games, interactive experiences',
    icon: Gamepad2,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'films' as Domain,
    name: 'Films',
    description: 'Storyboards, shot descriptions, scripts',
    icon: Film,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'research' as Domain,
    name: 'Research',
    description: 'Deep research, analysis, reports',
    icon: Search,
    color: 'from-amber-500 to-orange-500',
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
  beginner: 'text-emerald-400',
  intermediate: 'text-amber-400',
  advanced: 'text-red-400',
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

  const filteredTemplates = selectedDomain
    ? TEMPLATES.filter((t) => t.domain === selectedDomain)
    : TEMPLATES

  const handleDomainSelect = useCallback((domain: Domain) => {
    setSelectedDomain(domain)
    setStep(2)
    analytics.track('onboarding_domain_selected', { domain })
  }, [])

  const handleTemplateSelect = useCallback((template: Template) => {
    setSelectedTemplate(template)
    setStep(3)
    analytics.track('template_selected', { templateId: template.id, domain: template.domain })
  }, [])

  const handleStart = useCallback(() => {
    if (selectedTemplate) {
      analytics.track('onboarding_completed', {
        templateId: selectedTemplate.id,
        domain: selectedTemplate.domain,
      })
      onComplete?.(selectedTemplate)
      router.push(`/dashboard?template=${selectedTemplate.id}`)
    }
  }, [selectedTemplate, onComplete, router])

  const handleBack = useCallback(() => {
    if (step === 2) {
      setStep(1)
      setSelectedDomain(null)
    } else if (step === 3) {
      setStep(2)
      setSelectedTemplate(null)
    }
  }, [step])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-xl font-bold">Quick Start</h2>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s <= step ? 'w-10 bg-indigo-500' : 'w-6 bg-zinc-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Choose Domain */}
      {step === 1 && (
        <div className="space-y-6" style={{ animation: 'fadeIn 150ms ease-out' }}>
          <div>
            <h3 className="text-2xl font-bold">What do you want to build?</h3>
            <p className="mt-1 text-zinc-400">Choose your domain to get started quickly.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {DOMAINS.map((domain) => {
              const Icon = domain.icon
              return (
                <button
                  key={domain.id}
                  onClick={() => handleDomainSelect(domain.id)}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-6 text-left transition-all hover:border-white/20 hover:bg-white/[0.04] hover:shadow-lg"
                >
                  <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${domain.color} p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold">{domain.name}</h4>
                  <p className="mt-1 text-sm text-zinc-400">{domain.description}</p>
                  <ArrowRight className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-zinc-300" />
                </button>
              )
            })}
          </div>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Skip wizard and go to dashboard
            </button>
          )}
        </div>
      )}

      {/* Step 2: Select Template */}
      {step === 2 && (
        <div className="space-y-6" style={{ animation: 'fadeIn 150ms ease-out' }}>
          <div>
            <h3 className="text-2xl font-bold">Choose a template</h3>
            <p className="mt-1 text-zinc-400">
              Start with a pre-configured project. You can customize everything later.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={`group rounded-xl border p-4 text-left transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{template.name}</h4>
                  <span className={`text-xs ${DIFFICULTY_COLORS[template.difficulty]}`}>
                    {template.difficulty}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-400">{template.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="ml-auto text-xs text-zinc-500">~{template.estimatedTime}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Start */}
      {step === 3 && selectedTemplate && (
        <div className="space-y-6" style={{ animation: 'fadeIn 150ms ease-out' }}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500">
              <Rocket className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold">Ready to build!</h3>
            <p className="mt-2 text-zinc-400">
              Your <span className="text-white font-medium">{selectedTemplate.name}</span> project
              will be set up with AI-powered multi-agent assistance.
            </p>
          </div>

          <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Template</span>
                <span className="font-medium">{selectedTemplate.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Domain</span>
                <span className="font-medium capitalize">{selectedTemplate.domain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Estimated setup</span>
                <span className="font-medium">{selectedTemplate.estimatedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Agents</span>
                <span className="font-medium">
                  <Sparkles className="mr-1 inline h-3.5 w-3.5 text-indigo-400" />
                  Architect + Engineer + Critic
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleStart}
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02]"
            >
              Start Building
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
