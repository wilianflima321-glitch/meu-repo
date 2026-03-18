'use client'

import Link from 'next/link'
import { ArrowLeft, Shield, Zap, Globe, Key } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const API_ENDPOINTS = [
  {
    category: 'Health',
    endpoints: [
      { method: 'GET', path: '/api/health/live', description: 'Liveness probe' },
      { method: 'GET', path: '/api/health/ready', description: 'Readiness probe (DB check)' },
      { method: 'GET', path: '/api/health/startup', description: 'Startup probe' },
    ],
  },
  {
    category: 'Authentication',
    endpoints: [
      { method: 'POST', path: '/api/auth/register', description: 'Create new account' },
      { method: 'POST', path: '/api/auth/login', description: 'Login and get JWT token' },
      { method: 'GET', path: '/api/auth/me', description: 'Get current user profile' },
      { method: 'POST', path: '/api/auth/forgot-password', description: 'Request password reset' },
    ],
  },
  {
    category: 'Projects',
    endpoints: [
      { method: 'GET', path: '/api/projects', description: 'List user projects' },
      { method: 'POST', path: '/api/projects', description: 'Create new project' },
      { method: 'GET', path: '/api/projects/[id]', description: 'Get project details' },
      { method: 'DELETE', path: '/api/projects/[id]', description: 'Delete project' },
    ],
  },
  {
    category: 'AI',
    endpoints: [
      { method: 'POST', path: '/api/ai/chat', description: 'Send AI chat message' },
      { method: 'POST', path: '/api/ai/stream', description: 'Stream AI response (SSE)' },
      { method: 'POST', path: '/api/ai/inline-completion', description: 'Get inline code completion' },
      { method: 'GET', path: '/api/ai/provider-status', description: 'Check AI provider health' },
    ],
  },
  {
    category: 'Billing',
    endpoints: [
      { method: 'GET', path: '/api/billing/plans', description: 'List available plans' },
      { method: 'POST', path: '/api/billing/checkout', description: 'Create Stripe checkout session' },
      { method: 'POST', path: '/api/billing/portal', description: 'Open Stripe billing portal' },
      { method: 'GET', path: '/api/billing/usage', description: 'Get current usage data' },
    ],
  },
  {
    category: 'Preview',
    endpoints: [
      { method: 'POST', path: '/api/preview/runtime-provision', description: 'Provision preview sandbox' },
      { method: 'GET', path: '/api/preview/runtime-health', description: 'Check preview runtime health' },
      { method: 'GET', path: '/api/preview/runtime-readiness', description: 'Preview readiness check' },
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
    <div className="min-h-screen bg-black text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-12 pb-20">
        <Link href="/docs" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Docs
        </Link>

        <h1 className="text-4xl font-bold">API Reference</h1>
        <p className="mt-3 text-lg text-zinc-400">
          Complete REST API documentation for Aethel Engine. All endpoints require authentication unless noted.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <Key className="mb-2 h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-semibold">Authentication</h3>
            <p className="mt-1 text-xs text-zinc-400">Bearer token via Authorization header</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <Zap className="mb-2 h-5 w-5 text-[var(--aethel-warning)]" />
            <h3 className="text-sm font-semibold">Rate Limits</h3>
            <p className="mt-1 text-xs text-zinc-400">Plan-based. Check X-RateLimit-* headers.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <Globe className="mb-2 h-5 w-5 text-[var(--aethel-success)]" />
            <h3 className="text-sm font-semibold">Base URL</h3>
            <p className="mt-1 text-xs text-zinc-400 font-mono">https://aethel.dev/api</p>
          </div>
        </div>

        <div className="mt-10 space-y-8">
          {API_ENDPOINTS.map((category) => (
            <div key={category.category}>
              <h2 className="mb-4 text-xl font-semibold">{category.category}</h2>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                {category.endpoints.map((ep, i) => (
                  <div
                    key={ep.path}
                    className={`flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors ${
                      i < category.endpoints.length - 1 ? 'border-b border-white/5' : ''
                    }`}
                  >
                    <span className={`inline-flex w-16 justify-center rounded-md px-2 py-0.5 text-xs font-bold ${METHOD_COLORS[ep.method] || ''}`}>
                      {ep.method}
                    </span>
                    <code className="flex-1 font-mono text-sm text-zinc-300">{ep.path}</code>
                    <span className="text-sm text-zinc-500">{ep.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
