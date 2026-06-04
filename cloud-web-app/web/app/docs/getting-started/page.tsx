'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Terminal, Copy, Check } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import { useState, useCallback } from 'react'

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="group relative my-4 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]">
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] px-4 py-2">
        <span className="text-xs font-mono text-[var(--aethel-text-quaternary)]">{language}</span>
        <button type="button" onClick={copy} className="text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)] transition-colors">
          {copied ? <Check className="h-4 w-4 text-[var(--aethel-success)]" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm">
        <code className="font-mono text-[var(--aethel-text-secondary)]">{code}</code>
      </pre>
    </div>
  )
}

const STEPS = [
  {
    number: '01',
    title: 'Clone the repository',
    description: 'Get the source code and install dependencies.',
    code: `git clone https://github.com/wilianflima321-glitch/meu-repo.git
cd meu-repo
npm install
cd cloud-web-app/web
npm install`,
  },
  {
    number: '02',
    title: 'Configure environment',
    description: 'Set up your local environment variables.',
    code: `# From the repo root:
npm run setup:local-runtime

# This creates cloud-web-app/web/.env.local with defaults.
# Edit it to add your API keys:
# - JWT_SECRET (auto-generated)
# - CSRF_SECRET (auto-generated)
# - OPENROUTER_API_KEY or set AETHEL_AI_DEMO_MODE=true`,
  },
  {
    number: '03',
    title: 'Start the database',
    description: 'Launch PostgreSQL and Redis via Docker Compose.',
    code: `# Start infrastructure services:
npm run up:local-stack

# Push the database schema:
npm run setup:local-db`,
  },
  {
    number: '04',
    title: 'Launch the app',
    description: 'Start the development server and open the studio.',
    code: `# Start the dev server:
npm run dev

# Open http://localhost:3000 in your browser
# Run the health check:
curl http://localhost:3000/api/health/live`,
  },
  {
    number: '05',
    title: 'Verify everything works',
    description: 'Run the production gate check.',
    code: `# Full QA suite:
npm run qa:production-runtime-readiness

# Individual checks:
npm run typecheck
npm run lint
npm run build`,
  },
]

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-12 pb-20">
        <Link href="/docs" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Docs
        </Link>

        <h1 className="text-4xl font-bold">Getting Started</h1>
        <p className="mt-3 text-lg text-[var(--aethel-text-tertiary)]">
          Set up Aethel Engine locally in under 5 minutes. From zero to first AI-assisted project.
        </p>

        <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_5%,transparent)] p-4 text-sm text-[var(--aethel-warning-light)]">
          <strong>Prerequisites:</strong> Node.js 20+, Docker Desktop, Git.
          For demo mode (no AI keys needed), set <code className="rounded bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-1.5 py-0.5 font-mono text-xs">AETHEL_AI_DEMO_MODE=true</code> in your .env.local.
        </div>

        <div className="mt-10 space-y-12">
          {STEPS.map((step, i) => (
            <div key={step.number} className="relative">
              {i < STEPS.length - 1 && (
                <div className="absolute left-5 top-12 h-[calc(100%+1rem)] w-px bg-gradient-to-b from-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] to-transparent" />
              )}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--aethel-primary-dark)] to-[var(--aethel-info)] text-sm font-bold text-[var(--aethel-text-primary)]">
                  {step.number}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{step.title}</h2>
                  <p className="mt-1 text-sm text-[var(--aethel-text-tertiary)]">{step.description}</p>
                  <CodeBlock code={step.code} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_5%,transparent)] p-6 text-center">
          <Terminal className="mx-auto mb-3 h-8 w-8 text-[var(--aethel-success)]" />
          <h3 className="text-lg font-semibold text-[var(--aethel-success-light)]">You&apos;re all set!</h3>
          <p className="mt-1 text-sm text-[var(--aethel-text-tertiary)]">
            Open <code className="font-mono text-[var(--aethel-success-light)]">http://localhost:3000</code> and start building with Aethel Engine.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--aethel-success)] px-6 py-2.5 text-sm font-semibold text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-success-dark)] transition-colors"
          >
            Open Studio <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
