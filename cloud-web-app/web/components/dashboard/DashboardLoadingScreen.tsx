'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Sparkles, Code2, Zap } from 'lucide-react'

type DashboardLoadingScreenProps = {
  theme: 'dark' | 'light'
}

const LOADING_STEPS = [
  { icon: Layers, text: 'Inicializando workspace...', delay: 0 },
  { icon: Code2, text: 'Carregando ambiente...', delay: 800 },
  { icon: Sparkles, text: 'Preparando IA...', delay: 1600 },
  { icon: Zap, text: 'Quase pronto...', delay: 2400 },
]

export function DashboardLoadingScreen({ theme }: DashboardLoadingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev))
    }, 900)

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 100 ? prev + 2 : 100))
    }, 60)

    return () => {
      clearInterval(stepInterval)
      clearInterval(progressInterval)
    }
  }, [])

  const CurrentIcon = LOADING_STEPS[currentStep].icon

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${
      theme === 'dark' 
        ? 'bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]' 
        : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Background gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[var(--aethel-primary)]/10 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8" role="status" aria-live="polite">
        {/* Animated icon container */}
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-500/20 via-[var(--aethel-primary)]/20 to-cyan-500/20 blur-xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 shadow-2xl backdrop-blur-xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.5, opacity: 0, rotate: 20 }}
                transition={{ duration: 0.3 }}
              >
                <CurrentIcon className="h-9 w-9 text-cyan-400" />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Brand */}
        <motion.div 
          className="text-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-cyan-300 via-white to-cyan-300 bg-clip-text text-transparent">
              Aethel Studio
            </span>
          </h1>
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStep}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-2 text-sm text-slate-400"
            >
              {LOADING_STEPS[currentStep].text}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Progress bar */}
        <motion.div 
          className="w-64"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 via-[var(--aethel-primary)] to-cyan-400"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-slate-500" aria-hidden="true">
            {progress}%
          </p>
        </motion.div>

        {/* Step indicators */}
        <div className="flex items-center gap-2" aria-hidden="true">
          {LOADING_STEPS.map((_, index) => (
            <motion.div
              key={index}
              className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                index <= currentStep ? 'bg-cyan-400' : 'bg-slate-700'
              }`}
              animate={index === currentStep ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.5, repeat: index === currentStep ? Infinity : 0 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
