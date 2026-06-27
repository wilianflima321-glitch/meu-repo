'use client'

import { useCallback, useMemo, useState } from 'react'
import { Award, CheckCircle, ChevronRight, Eye, Play, Sparkles, Navigation } from 'lucide-react'
import Link from 'next/link'

import StudioLayout from '@/components/studio/StudioLayout'

interface TourStep {
  id: number
  title: string
  description: string
  actionLabel: string
  targetElement: string
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    title: 'Orbit the viewport',
    description: 'Use the mouse drag gesture or Arrow Keys to navigate and orbit the 3D world space.',
    actionLabel: 'Complete Navigation',
    targetElement: 'viewport-stage',
  },
  {
    id: 2,
    title: 'Apply generated material',
    description: 'Select the primary terrain mesh and assign a cryptographically signed procedural grass texture.',
    actionLabel: 'Apply Material',
    targetElement: 'material-panel',
  },
  {
    id: 3,
    title: 'Run physics simulator',
    description: 'Press play to run the fixed-timestep Rapier loop. Watch the objects fall under gravity.',
    actionLabel: 'Run Physics',
    targetElement: 'physics-controls',
  },
  {
    id: 4,
    title: 'Publish sandbox world',
    description: 'Compile your world package and publish it directly to the Aethel Arcade showcase.',
    actionLabel: 'Publish to Arcade',
    targetElement: 'publish-button',
  },
]

export default function OnboardingWorldPage() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [physicsTicked, setPhysicsTicked] = useState(false)
  const [materialApplied, setMaterialApplied] = useState(false)
  const [cameraRotated, setCameraRotated] = useState(false)
  const [arcadePublished, setArcadePublished] = useState(false)

  const activeStep = useMemo(() => TOUR_STEPS[currentStepIndex] || null, [currentStepIndex])

  const handleNext = useCallback(() => {
    if (!activeStep) return

    setCompletedSteps((prev) => [...prev, activeStep.id])

    if (currentStepIndex === 0) setCameraRotated(true)
    if (currentStepIndex === 1) setMaterialApplied(true)
    if (currentStepIndex === 2) setPhysicsTicked(true)
    if (currentStepIndex === 3) setArcadePublished(true)

    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    }
  }, [activeStep, currentStepIndex])

  const progressPercent = Math.round((completedSteps.length / TOUR_STEPS.length) * 100)

  return (
    <StudioLayout
      title="Guided Onboarding World"
      subtitle="Master viewport navigation, asset synthesis, physics ticks, and arcade releases."
      maxWidth="7xl"
    >
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
        {/* Viewport Simulation */}
        <div className="relative flex h-[500px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-[var(--aethel-border-primary)] bg-gradient-to-br from-[#0c0d12] to-[#141824] shadow-2xl">
          {/* Simulated 3D Grid & Gizmo */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] bg-center" />
          
          <div className={`absolute transition-transform duration-1000 flex flex-col items-center ${cameraRotated ? 'rotate-12 scale-95' : ''}`}>
            {/* Terrain box */}
            <div
              className={`h-40 w-60 rounded-xl border border-[var(--aethel-border-secondary)] transition-all duration-700 ${
                materialApplied
                  ? 'bg-gradient-to-tr from-green-950 to-emerald-900 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_40%,transparent)]'
              }`}
            >
              <div className="p-3 text-[10px] font-mono text-[var(--aethel-text-tertiary)] flex items-center justify-between">
                <span>Mesh: TerrainGrid</span>
                {materialApplied ? <span className="text-[var(--aethel-success)]">Material: Procedural Grass</span> : null}
              </div>
            </div>

            {/* Falling sphere */}
            <div
              className={`mt-4 h-12 w-12 rounded-full border border-[var(--aethel-border-secondary)] bg-gradient-to-tr from-amber-600 to-yellow-500 shadow-xl transition-all duration-[1500ms] ${
                physicsTicked ? 'translate-y-24 opacity-90 scale-90' : 'animate-bounce'
              }`}
            />
          </div>

          {/* Interactive Guided Highlight Overlay */}
          {activeStep && (
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] p-6 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10 animate-fade-in">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">
                  Step {activeStep.id} of {TOUR_STEPS.length}
                </span>
                <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">{activeStep.title}</h3>
                <p className="text-xs text-[var(--aethel-text-secondary)] leading-relaxed max-w-xl">
                  {activeStep.description}
                </p>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 self-end sm:self-center rounded-xl bg-[var(--aethel-primary)] px-4 py-2.5 text-xs font-semibold text-white hover:brightness-110"
              >
                {activeStep.actionLabel}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Completion Celebration Overlay */}
          {arcadePublished && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center z-20 animate-fade-in">
              <Award className="h-16 w-16 text-[var(--aethel-success)] animate-pulse" />
              <h2 className="mt-4 text-2xl font-bold md:text-3xl text-white">Tour Completed!</h2>
              <p className="mt-2 text-sm text-[var(--aethel-text-secondary)] max-w-md">
                You have successfully mastered the basics of Aethel Engine interface controls and asset publishing.
              </p>
              <div className="mt-6 flex gap-4">
                <Link
                  href="/marketplace"
                  className="rounded-xl bg-[var(--aethel-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
                >
                  Browse Plugins
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStepIndex(0)
                    setCompletedSteps([])
                    setPhysicsTicked(false)
                    setMaterialApplied(false)
                    setCameraRotated(false)
                    setArcadePublished(false)
                  }}
                  className="rounded-xl border border-[var(--aethel-border-primary)] px-5 py-2.5 text-sm text-white hover:bg-white/10"
                >
                  Restart Tour
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Tour Steps Checklist */}
        <aside className="rounded-3xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Tour Progress</h3>
              <p className="text-xs text-[var(--aethel-text-tertiary)] mt-1">Complete each task sequentially.</p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[var(--aethel-text-tertiary)]">
                <span>Completed</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--aethel-border-secondary)] overflow-hidden">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className="h-full bg-[var(--aethel-primary-light)] transition-all duration-500"
                />
              </div>
            </div>

            {/* Steps Checklist */}
            <div className="space-y-3 pt-4">
              {TOUR_STEPS.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id)
                const isActive = index === currentStepIndex && !arcadePublished

                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 rounded-2xl border p-4 transition-all duration-300 ${
                      isActive
                        ? 'border-[var(--aethel-primary)] bg-[color-mix(in_srgb,var(--aethel-primary)_6%,transparent)]'
                        : 'border-[var(--aethel-border-secondary)] bg-transparent'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-[var(--aethel-success)]" />
                      ) : (
                        <div
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${
                            isActive
                              ? 'border-[var(--aethel-primary)] text-[var(--aethel-primary)]'
                              : 'border-[var(--aethel-text-quaternary)] text-[var(--aethel-text-quaternary)]'
                          }`}
                        >
                          {step.id}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p
                        className={`text-xs font-semibold ${
                          isActive
                            ? 'text-[var(--aethel-text-primary)]'
                            : isCompleted
                              ? 'text-[var(--aethel-text-secondary)] line-through'
                              : 'text-[var(--aethel-text-tertiary)]'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-[10px] text-[var(--aethel-text-tertiary)] leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </aside>
      </div>
    </StudioLayout>
  )
}
