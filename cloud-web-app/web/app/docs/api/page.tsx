'use client'

import Link from 'next/link'
import { ArrowLeft, Shield, Zap, Globe, Key } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const API_ENDPOINTS = [
  {
    category: 'Health',
    summary: 'Health, startup, and dependency probes.',
    endpoints: [
      { method: 'GET', path: '/api/health/live', description: 'Liveness probe' },
      { method: 'GET', path: '/api/health/ready', description: 'Ready probe (DB check)' },
      { method: 'GET', path: '/api/health/startup', description: 'Startup probe' },
    ],
  },
  {
    category: 'Authentication',
    summary: 'Account, session, and recovery endpoints.',
    endpoints: [
      { method: 'POST', path: '/api/auth/register', description: 'Create new account' },
      { method: 'POST', path: '/api/auth/login', description: 'Login and get JWT token' },
      { method: 'GET', path: '/api/auth/me', description: 'Get current user profile' },
      { method: 'POST', path: '/api/auth/forgot-password', description: 'Request password reset' },
    ],
  },
  {
    category: 'Projects',
    summary: 'Workspace CRUD and project detail endpoints.',
    endpoints: [
      { method: 'GET', path: '/api/projects', description: 'List user projects' },
      { method: 'POST', path: '/api/projects', description: 'Create new project' },
      { method: 'GET', path: '/api/projects/[id]', description: 'Get project details' },
      { method: 'DELETE', path: '/api/projects/[id]', description: 'Delete project' },
    ],
  },
  {
    category: 'AI',
    summary: 'Chat, streaming, provider state, and inline assistance.',
    endpoints: [
      { method: 'POST', path: '/api/ai/chat', description: 'Send AI chat message' },
      { method: 'POST', path: '/api/ai/stream', description: 'Stream AI response (SSE)' },
      { method: 'POST', path: '/api/ai/inline-completion', description: 'Get inline code completion' },
      { method: 'GET', path: '/api/ai/provider-status', description: 'Check AI provider health' },
    ],
  },
  {
    category: 'Billing',
    summary: 'Plans, checkout, portal, and usage endpoints.',
    endpoints: [
      { method: 'GET', path: '/api/billing/plans', description: 'List available plans' },
      { method: 'POST', path: '/api/billing/checkout', description: 'Create Stripe checkout session' },
      { method: 'POST', path: '/api/billing/portal', description: 'Open Stripe billing portal' },
      { method: 'GET', path: '/api/billing/usage', description: 'Get current usage data' },
    ],
  },
  {
    category: 'Preview',
    summary: 'Preview runtime, health, and status endpoints.',
    endpoints: [
      { method: 'POST', path: '/api/preview/runtime-provision', description: 'Provision preview sandbox' },
      { method: 'GET', path: '/api/preview/runtime-health', description: 'Check preview runtime health' },
      { method: 'GET', path: '/api/preview/runtime-readiness', description: 'Preview status check' },
    ],
  },
]

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success)]',
  POST: 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info)]',
  PUT: 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)]',
  DELETE: 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)]',
}

export default function APIDocsPage() {
  return (
    <div data-api-reference-surface="compact" className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-12 pb-20">
        <Link href="/docs" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Docs
        </Link>

        <h1 className="text-4xl font-bold">API reference</h1>
        <p className="mt-3 max-w-2xl text-lg text-[var(--aethel-text-tertiary)]">
          The public contract map for core product flows. Endpoints require authentication unless noted.
        </p>

        <div className="mt-6 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] p-4">
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-[var(--aethel-primary-light)]" />
              <div>
                <h3 className="font-semibold">Auth</h3>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">Bearer token</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-[var(--aethel-warning)]" />
              <div>
                <h3 className="font-semibold">Limits</h3>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">Plan-based headers</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-[var(--aethel-success)]" />
              <div>
                <h3 className="font-semibold">Base URL</h3>
                <p className="font-mono text-xs text-[var(--aethel-text-tertiary)]">https://aethel.dev/api</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-4">
          {API_ENDPOINTS.map((category) => (
            <details key={category.category} className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)]" open={category.category === 'Health'}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
                <span>
                  <span className="block text-lg font-semibold">{category.category}</span>
                  <span className="mt-1 block text-sm text-[var(--aethel-text-tertiary)]">{category.summary}</span>
                </span>
                <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2.5 py-1 text-xs text-[var(--aethel-text-tertiary)]">
                  {category.endpoints.length} endpoints
                </span>
              </summary>
              <div className="overflow-hidden border-t border-[var(--aethel-border-primary)]">
                {category.endpoints.map((ep, i) => (
                  <div
                    key={`${ep.method}-${ep.path}`}
                    className={`grid gap-2 px-4 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] sm:grid-cols-[4rem_minmax(0,1fr)_minmax(10rem,0.8fr)] sm:items-center ${
                      i < category.endpoints.length - 1 ? 'border-b border-[var(--aethel-border-subtle)]' : ''
                    }`}
                  >
                    <span className={`inline-flex w-16 justify-center rounded-md px-2 py-0.5 text-xs font-bold ${METHOD_COLORS[ep.method] || ''}`}>
                      {ep.method}
                    </span>
                    <code className="min-w-0 break-all font-mono text-sm text-[var(--aethel-text-secondary)]">{ep.path}</code>
                    <span className="text-sm text-[var(--aethel-text-quaternary)]">{ep.description}</span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
