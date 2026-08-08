'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  ChevronRight,
  Cpu,
  Gauge,
  Globe,
  HardDrive,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Data constants (spec-exact — no modifications)
// ---------------------------------------------------------------------------

interface ComparisonItem {
  criterion: string
  aethel: string
  unreal: string
  unity: string
  roblox: string
  aethelHighlight?: boolean
}

const ENGINE_COMPARISON_DATA: ComparisonItem[] = [
  {
    criterion: 'Engine Royalties',
    aethel: '0% (Forever)',
    unreal: '5% (After $1M gross)',
    unity: 'Complex seat/runtime fees',
    roblox: 'N/A',
    aethelHighlight: true,
  },
  {
    criterion: 'Marketplace Commission',
    aethel: '12% flat',
    unreal: '12% flat',
    unity: '30% asset store',
    roblox: 'Up to 70% commission',
    aethelHighlight: true,
  },
  {
    criterion: 'IP Ownership',
    aethel: '100% User Owned (AI & Assets)',
    unreal: '100% User Owned',
    unity: '100% User Owned',
    roblox: 'Platform claims usage rights',
  },
  {
    criterion: 'Local AI Execution',
    aethel: 'Fully supported (Offline runtimes)',
    unreal: 'No native local AI integration',
    unity: 'No native local AI integration',
    roblox: 'Cloud execution only',
  },
]

interface PlanTier {
  name: string
  price: string
  billing: string
  storage: string
  agents: string
  renderHours: string
  extraFeatures: string[]
  badge?: string
}

const SUBSCRIPTION_PLANS: PlanTier[] = [
  {
    name: 'Free',
    price: '$0',
    billing: 'forever',
    storage: '2 GB',
    agents: '1 concurrent agent',
    renderHours: 'Basic local CPU/GPU execution',
    extraFeatures: ['Web editor access', '1 active project', 'Community support'],
  },
  {
    name: 'Starter',
    price: '$15',
    billing: 'per seat / month',
    storage: '10 GB',
    agents: '2 concurrent agents',
    renderHours: 'Standard GPU local execution',
    extraFeatures: ['3 active projects', 'Full offline runtime', 'Email support'],
  },
  {
    name: 'Basic',
    price: '$29',
    billing: 'per seat / month',
    badge: 'Grandfathered',
    storage: '20 GB',
    agents: '5 concurrent agents',
    renderHours: '2 Hours cloud render farm / mo',
    extraFeatures: ['5 active projects', 'Standard credit wallet access', 'Standard support SLA'],
  },
  {
    name: 'Pro',
    price: '$49',
    billing: 'per seat / month',
    badge: 'Most Popular',
    storage: '50 GB',
    agents: '10 concurrent agents',
    renderHours: '10 Hours cloud render farm / mo',
    extraFeatures: ['Unlimited projects', 'Bring Your Own Key (BYOK) proxy', 'Priority support'],
  },
  {
    name: 'Studio',
    price: '$99',
    billing: 'per seat / month',
    storage: '250 GB',
    agents: 'Unlimited agents',
    renderHours: '50 Hours cloud render farm / mo',
    extraFeatures: ['Unlimited projects', 'Local Llama-3 / Phi-3 inference', 'Developer support SLA'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    billing: 'annual contract',
    storage: 'Dedicated / Custom',
    agents: 'Unlimited (Dedicated)',
    renderHours: 'Dedicated render instances',
    extraFeatures: ['Private model fine-tuning', 'SAML SSO & SCIM sync', 'Dedicated TAM (1h SLA)'],
  },
]

interface RequirementDetail {
  spec: string
  minimum: string
  recommended: string
}

const HARDWARE_SPECS: RequirementDetail[] = [
  {
    spec: 'OS',
    minimum: 'Windows 10 (64-bit), macOS 12, or Ubuntu 20.04',
    recommended: 'Windows 11 or macOS 14',
  },
  {
    spec: 'CPU',
    minimum: 'Dual-Core Intel/AMD with AVX2 support',
    recommended: 'Quad-Core Intel/AMD or Apple Silicon (M1/M2/M3)',
  },
  {
    spec: 'RAM',
    minimum: '8 GB',
    recommended: '16 GB or higher',
  },
  {
    spec: 'Graphics API',
    minimum: 'WebGL 2.0 or OpenGL 3.3',
    recommended: 'Vulkan 1.2+, DirectX 12, or Metal (WGPU accelerated)',
  },
  {
    spec: 'GPU / VRAM',
    minimum: 'Integrated graphics',
    recommended: 'NVIDIA RTX 3060+ (6GB VRAM, CUDA 11.8+) or Apple Unified Memory',
  },
]

interface LegalSection {
  id: string
  title: string
  content: string[]
}

const LEGAL_SECTIONS: LegalSection[] = [
  {
    id: 'acceptance',
    title: '1. Legal Binding Agreement',
    content: [
      'By checking the terms checkbox during registration, authenticating via third-party OAuth providers, or downloading the Aethel client, you form a legally binding contract with Aethel Studio Inc. If you accept on behalf of an entity, you warrant that you hold full corporate authority to bind that entity.',
      'Access to the cloud rendering engine, AI agent code generation tools, and collaborative canvas workspaces is contingent upon continued compliance with these terms and any applicable plan quotas.',
    ],
  },
  {
    id: 'billing',
    title: '2. Fees, Subscriptions, and Credit Wallet',
    content: [
      'Subscription plans are billed in advance on a recurring monthly or annual basis. Quotas (storage, agents, rendering hours) reset at the start of each billing cycle and do not roll over.',
      'AI inference queries consume credits from your active Wallet. Credit consumption is computed based on model size and token counts (e.g., Gemini Flash at a 1x multiplier, GPT-4o at 30x, Claude Opus at 100x).',
      'To maximize editor performance, credit deductions are temporarily buffered via a Redis ledger and committed to the primary PostgreSQL database asynchronously upon task batch completion.',
    ],
  },
  {
    id: 'byok',
    title: '3. Bring Your Own Key (BYOK) Security & Zero-Knowledge',
    content: [
      'Pro, Studio, and Enterprise users may configure custom API keys for third-party AI providers (BYOK). All supplied API keys are stored exclusively in your local device workspace storage (Zero-Knowledge architecture) and are transmitted directly to the third-party providers via client-side proxy tunnels.',
      'Aethel Studio does not store, transmit, or cache your BYOK credentials on its centralized servers. You are solely responsible for all API usage costs, billing alerts, security breaches, and terms violations associated with your third-party provider accounts.',
    ],
  },
  {
    id: 'sidecars',
    title: '4. Native Sidecars & Local Runtimes',
    content: [
      'The Aethel client includes native binary sidecars (FFmpeg media context managers, ONNX model runtimes, WGPU viewport compilers) that execute locally on your physical hardware.',
      'These local runtimes execute at your own risk. Aethel Studio Inc. disclaims all liability for hardware failures, thermal throttling, local operating system incompatibilities, or security exploits arising from compromised local operating environments.',
    ],
  },
  {
    id: 'ugc',
    title: '5. User-Generated Content & AI Ownership',
    content: [
      'Aethel Studio guarantees 100% user ownership over all assets, scripts, game bibles, levels, and executables produced within your workspace. We claim 0% royalties on commercial distributions of games compiled with the Aethel Engine.',
      'Aethel does not train global AI models on your private project codebases, workspace documents, or local assets. Your data remains strictly within your private account boundary.',
      'You grant Aethel Studio a limited, worldwide, royalty-free license to host, display, and parse your project assets solely for the purpose of operating your editor session and rendering web-based viewport previews.',
    ],
  },
  {
    id: 'marketplace',
    title: '6. Marketplace License & Commission',
    content: [
      'When listing assets on the Aethel Marketplace, you warrant that you hold all legal rights, licenses, and clearances. You grant purchasing users a non-exclusive, perpetual, commercial license to use the assets.',
      'Aethel Studio retains a flat 12% commission on all marketplace transactions. The remaining 88% is disbursed to the publisher\'s wallet under the specified payout timeline.',
    ],
  },
  {
    id: 'liability',
    title: '7. Limitation of Liability & SLA',
    content: [
      'Aethel Studio services and runtimes are provided on an \'as-is\' and \'as-available\' basis. We make no warranty that operations will be uninterrupted or error-free.',
      'In no event shall Aethel Studio Inc. be liable for any indirect, incidental, special, or consequential damages. Our total liability for any claim under these terms is capped at the total subscription fees paid by you to Aethel Studio during the twelve (12) months preceding the event.',
    ],
  },
]

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type TabKey = 'guide' | 'plans' | 'system' | 'legal'

interface TabMeta {
  key: TabKey
  label: string
  icon: React.ReactNode
}

const TABS: TabMeta[] = [
  { key: 'guide', label: 'Platform Guide', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { key: 'plans', label: 'Subscription Plans', icon: <Star className="h-3.5 w-3.5" /> },
  { key: 'system', label: 'System Requirements', icon: <Cpu className="h-3.5 w-3.5" /> },
  { key: 'legal', label: 'Legal Terms', icon: <Scale className="h-3.5 w-3.5" /> },
]

// ---------------------------------------------------------------------------
// Shared micro-components
// ---------------------------------------------------------------------------

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-6 ${className}`}
    >
      {children}
    </div>
  )
}

function Tag({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'cyan' | 'amber' | 'success' | 'purple' }) {
  const styles: Record<string, string> = {
    default: 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)] border-[var(--aethel-border-subtle)]',
    cyan: 'bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] text-[var(--aethel-info-light)] border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)]',
    amber: 'bg-[color-mix(in_srgb,var(--aethel-warning)_14%,transparent)] text-[var(--aethel-warning-light)] border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)]',
    success: 'bg-[color-mix(in_srgb,var(--aethel-success)_14%,transparent)] text-[var(--aethel-success-light)] border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)]',
    purple: 'bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] text-[var(--aethel-primary-light)] border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)]',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${styles[variant]}`}>
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Tab 1 — Platform Guide
// ---------------------------------------------------------------------------

function GuideTab() {
  return (
    <div className="space-y-8">
      {/* Hero guarantee card */}
      <div
        className="relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] p-8"
        style={{
          background: 'linear-gradient(135deg, color-mix(in_srgb,var(--aethel-primary)_12%,transparent) 0%, color-mix(in_srgb,var(--aethel-info)_8%,transparent) 100%)',
          boxShadow: '0 0 40px color-mix(in_srgb,var(--aethel-primary)_14%,transparent), 0 0 80px color-mix(in_srgb,var(--aethel-info)_8%,transparent)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 aethel-grid-overlay opacity-20" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Tag variant="purple">Aethel Guarantee</Tag>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[var(--aethel-text-primary)] sm:text-4xl">
              0% Engine Royalties.{' '}
              <span className="text-[var(--aethel-primary-light)]">Forever.</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--aethel-text-secondary)]">
              We will never collect royalties on games and applications you build and ship with the Aethel Engine — regardless of your revenue or the number of players. That is a permanent, unconditional guarantee.
            </p>
          </div>
          <div className="shrink-0 text-center">
            <div
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full text-4xl font-black text-white"
              style={{
                background: 'linear-gradient(135deg, var(--aethel-primary) 0%, var(--aethel-info) 100%)',
                boxShadow: '0 0 24px color-mix(in_srgb,var(--aethel-primary)_50%,transparent)',
              }}
              aria-label="Zero percent royalties"
            >
              0%
            </div>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--aethel-text-tertiary)]">Royalties</p>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <SectionCard>
        <h3 className="mb-5 flex items-center gap-2 text-base font-semibold text-[var(--aethel-text-primary)]">
          <Globe className="h-4 w-4 text-[var(--aethel-info)]" />
          Engine Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-[var(--aethel-border-secondary)]">
                <th className="py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">Criterion</th>
                <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] px-2.5 py-1 text-[var(--aethel-info-light)]">
                    <Sparkles className="h-3 w-3" /> Aethel
                  </span>
                </th>
                {['Unreal Engine', 'Unity', 'Roblox'].map((col) => (
                  <th key={col} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ENGINE_COMPARISON_DATA.map((row, i) => (
                <tr
                  key={row.criterion}
                  className={`border-b border-[var(--aethel-border-secondary)]/50 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] ${i % 2 === 0 ? '' : 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)]'}`}
                >
                  <td className="py-3 pr-4 text-xs font-medium text-[var(--aethel-text-secondary)]">{row.criterion}</td>
                  <td className="border-l-2 border-[color-mix(in_srgb,var(--aethel-info)_22%,transparent)] px-3 py-3 text-center">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold transition-all duration-150 ${
                        row.aethelHighlight
                          ? 'bg-[color-mix(in_srgb,var(--aethel-success)_16%,transparent)] text-[var(--aethel-success-light)] shadow-[0_0_8px_rgba(34,197,94,0.25)]'
                          : 'text-[var(--aethel-text-primary)]'
                      }`}
                    >
                      {row.aethel}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-xs text-[var(--aethel-text-tertiary)]">{row.unreal}</td>
                  <td className="px-3 py-3 text-center text-xs text-[var(--aethel-text-tertiary)]">{row.unity}</td>
                  <td className="px-3 py-3 text-center text-xs text-[var(--aethel-text-tertiary)]">{row.roblox}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* IP & AI Privacy */}
      <div className="grid gap-5 md:grid-cols-2">
        <SectionCard>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-success)_16%,transparent)]">
            <ShieldCheck className="h-5 w-5 text-[var(--aethel-success)]" />
          </div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--aethel-text-primary)]">100% Creator IP & Ownership</h3>
          <p className="text-xs leading-relaxed text-[var(--aethel-text-secondary)]">
            Every script, 3D asset, game bible, compiled executable, and AI-generated artifact produced in your Aethel workspace belongs to you entirely. We claim zero licensing fees and zero royalties — regardless of your commercial success.
          </p>
          <div className="mt-4 flex flex-col gap-1.5">
            {['0% royalties on game revenue', '12% flat marketplace commission', 'Full source export rights'].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-[var(--aethel-text-secondary)]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--aethel-success)]" />
                {item}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-primary)_16%,transparent)]">
            <Zap className="h-5 w-5 text-[var(--aethel-primary)]" />
          </div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--aethel-text-primary)]">Strict AI Data Privacy</h3>
          <p className="text-xs leading-relaxed text-[var(--aethel-text-secondary)]">
            Aethel does not train global AI models on your private project data, codebases, or local assets. BYOK keys are stored exclusively on your device in a Zero-Knowledge architecture — they never touch our servers.
          </p>
          <div className="mt-4 flex flex-col gap-1.5">
            {['No training on your project data', 'Zero-Knowledge BYOK key storage', 'Local ONNX inference available'].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-[var(--aethel-text-secondary)]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--aethel-primary-light)]" />
                {item}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 2 — Subscription Plans
// ---------------------------------------------------------------------------

function PlanCard({ plan }: { plan: PlanTier }) {
  const isPro = plan.badge === 'Most Popular'
  const isGrandfathered = plan.badge === 'Grandfathered'
  const isEnterprise = plan.name === 'Enterprise'

  return (
    <div
      className={`aethel-card-lift relative flex flex-col rounded-xl border p-5 ${
        isPro
          ? 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:border-[color-mix(in_srgb,var(--aethel-info)_55%,transparent)]'
          : isEnterprise
            ? 'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] hover:border-[color-mix(in_srgb,var(--aethel-primary)_48%,transparent)]'
            : 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] hover:border-[color-mix(in_srgb,var(--aethel-info)_25%,transparent)]'
      }`}
      style={
        isPro
          ? { boxShadow: 'var(--aethel-terms-nav-glow)' }
          : undefined
      }
    >
      {/* Badge */}
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Tag variant={isPro ? 'cyan' : isGrandfathered ? 'amber' : 'default'}>
            {plan.badge}
          </Tag>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--aethel-text-tertiary)]">{plan.name}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tracking-[-0.04em] text-[var(--aethel-text-primary)]">{plan.price}</span>
          {!isEnterprise && (
            <span className="text-xs text-[var(--aethel-text-tertiary)]">{plan.billing}</span>
          )}
        </div>
        {isEnterprise && (
          <p className="text-xs text-[var(--aethel-text-tertiary)]">{plan.billing}</p>
        )}
      </div>

      {/* Resources */}
      <div className="mb-4 space-y-2 rounded-lg border border-[var(--aethel-border-secondary)]/60 bg-[var(--aethel-surface-primary)]/40 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]"><HardDrive className="h-3.5 w-3.5" /> Storage</span>
          <span className="font-medium text-[var(--aethel-text-primary)]">{plan.storage}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]"><Cpu className="h-3.5 w-3.5" /> Agents</span>
          <span className="font-medium text-[var(--aethel-text-primary)]">{plan.agents}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]"><Gauge className="h-3.5 w-3.5" /> Rendering</span>
          <span className="font-medium text-[var(--aethel-text-primary)]">{plan.renderHours}</span>
        </div>
      </div>

      {/* Features */}
      <ul className="mt-auto space-y-1.5">
        {plan.extraFeatures.map((feat) => (
          <li key={feat} className="flex items-start gap-2 text-xs text-[var(--aethel-text-secondary)]">
            <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--aethel-success)]" />
            {feat}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href={plan.name === 'Enterprise' ? 'mailto:sales@aethel.ai' : `/register?plan=${plan.name.toLowerCase()}`}
        className={`mt-5 flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
          isPro
            ? 'bg-[var(--aethel-info)] text-white hover:bg-[var(--aethel-info-light)]'
            : 'border border-[var(--aethel-border-secondary)] text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-primary)]'
        }`}
      >
        {plan.name === 'Enterprise' ? 'Contact Sales' : plan.name === 'Free' ? 'Get started free' : `Get ${plan.name}`}
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

function PlansTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-[-0.02em] text-[var(--aethel-text-primary)]">Subscription Plans</h2>
        <p className="mt-1.5 text-sm text-[var(--aethel-text-secondary)]">
          All plans include the full Aethel Engine at 0% royalties. Upgrade or downgrade anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </div>

      {/* AI credit wallet callout */}
      <SectionCard className="border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_5%,transparent)]">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--aethel-warning-light)]">
          <Zap className="h-4 w-4" />
          AI Credit Wallet — How multipliers work
        </h4>
        <p className="text-xs leading-relaxed text-[var(--aethel-text-secondary)]">
          Each AI query consumes credits proportional to the model&apos;s real-world cost.{' '}
          <strong className="text-[var(--aethel-text-primary)]">Gemini 1.5 Flash</strong> is the base at{' '}
          <strong className="text-[var(--aethel-text-primary)]">1×</strong>.{' '}
          <strong className="text-[var(--aethel-text-primary)]">GPT-4o</strong> costs{' '}
          <strong className="text-[var(--aethel-text-primary)]">30×</strong>, and{' '}
          <strong className="text-[var(--aethel-text-primary)]">Claude Opus</strong> costs{' '}
          <strong className="text-[var(--aethel-text-primary)]">100×</strong> per token.
          For maximum throughput, credit debits are buffered in a Redis intermediate ledger and batch-flushed
          to the primary database at agent task completion — minimising lock contention without affecting billing accuracy.
        </p>
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 3 — System Requirements
// ---------------------------------------------------------------------------

function SystemTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-[-0.02em] text-[var(--aethel-text-primary)]">System Requirements</h2>
        <p className="mt-1.5 text-sm text-[var(--aethel-text-secondary)]">
          Minimum and recommended specs for native GPU rendering, ONNX inference, and full offline runtime.
        </p>
      </div>

      <SectionCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[var(--aethel-border-secondary)]">
                <th className="py-3 pr-5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">Component</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">Minimum</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1 text-[var(--aethel-success-light)]">
                    <Star className="h-3 w-3" /> Recommended
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {HARDWARE_SPECS.map((row, i) => (
                <tr
                  key={row.spec}
                  className={`border-b border-[var(--aethel-border-secondary)]/40 ${i % 2 !== 0 ? 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)]' : ''}`}
                >
                  <td className="py-3 pr-5 text-xs font-semibold text-[var(--aethel-text-primary)]">{row.spec}</td>
                  <td className="px-3 py-3 text-xs text-[var(--aethel-text-tertiary)]">{row.minimum}</td>
                  <td className="px-3 py-3 text-xs text-[var(--aethel-success-light)]">{row.recommended}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Cloud fallback info panel */}
      <div
        className="rounded-xl border p-6"
        style={{
          borderColor: 'color-mix(in_srgb,var(--aethel-warning) 28%,transparent)',
          background: 'color-mix(in_srgb,var(--aethel-warning) 6%,transparent)',
          boxShadow: '0 0 20px color-mix(in_srgb,var(--aethel-warning) 8%,transparent)',
        }}
      >
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--aethel-warning-light)]">
          <Zap className="h-4 w-4" />
          Automatic Cloud Fallback
        </h4>
        <p className="text-xs leading-relaxed text-[var(--aethel-text-secondary)]">
          If your local hardware lacks{' '}
          <strong className="text-[var(--aethel-text-primary)]">AVX2 CPU extensions</strong> or the required graphics APIs
          (<strong className="text-[var(--aethel-text-primary)]">Vulkan 1.2+</strong>,{' '}
          <strong className="text-[var(--aethel-text-primary)]">DirectX 12</strong>, or{' '}
          <strong className="text-[var(--aethel-text-primary)]">Metal</strong>),
          the Aethel desktop client detects this at startup and automatically routes 3D rendering and local AI inference
          to the Aethel Cloud Sandbox — no manual configuration required.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--aethel-text-secondary)]">
          <strong className="text-[var(--aethel-warning-light)]">Note:</strong>{' '}
          Cloud fallback rendering and inference draw credits from your active Wallet at the standard model multiplier rates.
          You can monitor usage in Settings → Credit Wallet.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 4 — Legal Terms
// ---------------------------------------------------------------------------

function LegalTab({ activeSection, onSection }: { activeSection: string; onSection: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      {/* Sidebar nav */}
      <nav className="shrink-0 lg:sticky lg:top-20 lg:w-52 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto" aria-label="Legal sections">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--aethel-text-tertiary)]">Sections</p>
        <ul className="space-y-1">
          {LEGAL_SECTIONS.map((sec) => (
            <li key={sec.id}>
              <button
                type="button"
                onClick={() => onSection(sec.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-xs transition-colors ${
                  activeSection === sec.id
                    ? 'bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] text-[var(--aethel-info-light)] font-medium'
                    : 'text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-secondary)]'
                }`}
              >
                {sec.title.replace(/^\d+\. /, '')}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex-1 space-y-6">
        {LEGAL_SECTIONS.map((sec) => (
          <div
            key={sec.id}
            id={`legal-${sec.id}`}
            className={`rounded-xl border p-6 transition-all duration-200 ${
              activeSection === sec.id
                ? 'border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]'
                : 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]'
            }`}
          >
            <h3 className="mb-4 text-sm font-semibold text-[var(--aethel-text-primary)]">{sec.title}</h3>
            <div className="space-y-3">
              {sec.content.map((para, i) => (
                <p key={i} className="text-xs leading-relaxed text-[var(--aethel-text-secondary)]">{para}</p>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-3 border-t border-[var(--aethel-border-secondary)] pt-6 text-xs text-[var(--aethel-text-tertiary)]">
          <span>Questions? Contact <a href="mailto:legal@aethel.ai" className="text-[var(--aethel-info-light)] hover:underline">legal@aethel.ai</a></span>
          <span>·</span>
          <Link href="/privacy" className="text-[var(--aethel-info-light)] hover:underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root hub component
// ---------------------------------------------------------------------------

export function TermsHubClient({ lastUpdated }: { lastUpdated: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>('guide')
  const [activeLegalSection, setActiveLegalSection] = useState(LEGAL_SECTIONS[0].id)

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      {/* Hero header */}
      <header className="relative overflow-hidden border-b border-[var(--aethel-border-secondary)] px-6 py-12">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, color-mix(in_srgb,var(--aethel-primary) 10%,transparent), transparent)' }} />
        <div className="relative mx-auto max-w-5xl">
          <Tag variant="cyan">Platform Agreement Hub</Tag>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.03em] text-[var(--aethel-text-primary)] sm:text-5xl">
            Terms &amp; Agreements
          </h1>
          <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
            Last updated: <span className="text-[var(--aethel-text-primary)]">{lastUpdated}</span>
          </p>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="sticky top-0 z-20 border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] backdrop-blur-lg px-6" style={{ boxShadow: 'var(--aethel-terms-header-shadow)' }}>
        <div className="mx-auto max-w-5xl">
          <nav className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Terms sections">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`tab-panel-${tab.key}`}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'aethel-tab-indicator flex shrink-0 items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-medium transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]',
                    isActive
                      ? 'border-[var(--aethel-info)] text-[var(--aethel-info-light)] [text-shadow:0_0_12px_rgba(var(--aethel-info-rgb),0.55)]'
                      : 'border-transparent text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-secondary)]',
                  ].join(' ')}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab panels */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div
          role="tabpanel"
          id={`tab-panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          key={activeTab}
        >
          {activeTab === 'guide' && <GuideTab />}
          {activeTab === 'plans' && <PlansTab />}
          {activeTab === 'system' && <SystemTab />}
          {activeTab === 'legal' && (
            <LegalTab
              activeSection={activeLegalSection}
              onSection={(id) => {
                setActiveLegalSection(id)
                document.getElementById(`legal-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}
