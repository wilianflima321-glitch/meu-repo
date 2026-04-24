'use client'

/**
 * Design System Demo Page
 * Showcase of new Aethel UI components and design tokens
 */

import React from 'react'
import CoreUiProviders from '@/components/providers/CoreUiProviders'
import {
  GlassPanel,
  GlowBadge,
  AethelButton,
  AethelInput,
  Skeleton,
  StatusIndicator,
  Divider,
  Tooltip,
} from '@/components/ui/primitives'
import { useToastActions } from '@/components/ui/toast-system'
import { tokens } from '@/lib/design-tokens'
import { MobileNavBar, SwipeablePanel, BottomSheet } from '@/components/ui/mobile-gestures'
import {
  Sparkles,
  Code2,
  MessageSquare,
  Play,
  Settings,
  ChevronRight,
  Send,
  Bot,
  Zap,
  Shield,
  Layout,
} from 'lucide-react'

const SURFACE_PRIMARY = 'var(--aethel-surface-primary)'
const TEXT_PRIMARY = 'var(--aethel-text-primary)'
const TEXT_SECONDARY = 'var(--aethel-text-secondary)'
const TEXT_TERTIARY = 'var(--aethel-text-tertiary)'
const ACCENT_CYAN = 'var(--aethel-info)'
const ACCENT_INDIGO = 'var(--aethel-primary-light)'

function DesignSystemDemoBody() {
  const { success, error, warning, info, promise } = useToastActions()
  const [showMobileNav, setShowMobileNav] = React.useState(false)
  const [showBottomSheet, setShowBottomSheet] = React.useState(false)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const handlePromiseDemo = () => {
    promise(new Promise((resolve) => setTimeout(() => resolve('Data loaded!'), 2000)), {
      loading: 'Loading data...',
      success: (data) => `Success: ${data}`,
      error: (err) => `Error: ${err.message}`,
    })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: SURFACE_PRIMARY,
        color: TEXT_PRIMARY,
        fontFamily: tokens.typography.fontFamily.sans,
        padding: tokens.spacing['8'],
      }}
    >
      <GlassPanel variant="strong" padding="lg" glow="cyan">
        <h1
          style={{
            fontSize: tokens.typography.fontSize['4xl'],
            fontWeight: tokens.typography.fontWeight.bold,
            marginBottom: tokens.spacing['2'],
            background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Aethel Design System v2.1
        </h1>
        <p style={{ color: TEXT_SECONDARY, fontSize: tokens.typography.fontSize.lg }}>
          Modern components with glassmorphism, unified tokens, and mobile-first gestures
        </p>
      </GlassPanel>

      <Divider style={{ margin: `${tokens.spacing['8']} 0` }} />

      <section style={{ marginBottom: tokens.spacing['8'] }}>
        <h2
          style={{
            fontSize: tokens.typography.fontSize['2xl'],
            fontWeight: tokens.typography.fontWeight.semibold,
            marginBottom: tokens.spacing['6'],
            color: TEXT_PRIMARY,
          }}
        >
          Glass Panels
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: tokens.spacing['6'],
          }}
        >
          <GlassPanel variant="subtle" padding="md">
            <h3 style={{ marginBottom: tokens.spacing['2'], color: TEXT_SECONDARY }}>Subtle</h3>
            <p style={{ fontSize: tokens.typography.fontSize.sm, color: TEXT_TERTIARY }}>
              Light glass effect for secondary content
            </p>
          </GlassPanel>

          <GlassPanel variant="medium" padding="md" glow="cyan">
            <h3 style={{ marginBottom: tokens.spacing['2'], color: ACCENT_CYAN }}>
              Medium + Glow
            </h3>
            <p style={{ fontSize: tokens.typography.fontSize.sm, color: TEXT_TERTIARY }}>
              Medium glass with cyan glow effect
            </p>
          </GlassPanel>

          <GlassPanel variant="strong" padding="md" glow="indigo">
            <h3 style={{ marginBottom: tokens.spacing['2'], color: ACCENT_INDIGO }}>
              Strong + Indigo
            </h3>
            <p style={{ fontSize: tokens.typography.fontSize.sm, color: TEXT_TERTIARY }}>
              Strong glass with indigo accent
            </p>
          </GlassPanel>
        </div>
      </section>

      <section style={{ marginBottom: tokens.spacing['8'] }}>
        <h2
          style={{
            fontSize: tokens.typography.fontSize['2xl'],
            fontWeight: tokens.typography.fontWeight.semibold,
            marginBottom: tokens.spacing['6'],
          }}
        >
          Glow Badges
        </h2>
        <div style={{ display: 'flex', gap: tokens.spacing['3'], flexWrap: 'wrap' }}>
          <GlowBadge color="cyan">Beta</GlowBadge>
          <GlowBadge color="emerald">Production</GlowBadge>
          <GlowBadge color="indigo">Enterprise</GlowBadge>
          <GlowBadge color="violet">AI Powered</GlowBadge>
          <GlowBadge color="amber">Warning</GlowBadge>
          <GlowBadge color="rose">Error</GlowBadge>
        </div>
      </section>

      <section style={{ marginBottom: tokens.spacing['8'] }}>
        <h2
          style={{
            fontSize: tokens.typography.fontSize['2xl'],
            fontWeight: tokens.typography.fontWeight.semibold,
            marginBottom: tokens.spacing['6'],
          }}
        >
          Buttons
        </h2>
        <div
          style={{
            display: 'flex',
            gap: tokens.spacing['4'],
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <AethelButton variant="primary" leftIcon={<Sparkles size={16} />}>
            Primary
          </AethelButton>
          <AethelButton variant="secondary" leftIcon={<Code2 size={16} />}>
            Secondary
          </AethelButton>
          <AethelButton variant="ghost" leftIcon={<Settings size={16} />}>
            Ghost
          </AethelButton>
          <AethelButton variant="danger">Danger</AethelButton>
          <AethelButton variant="primary" size="sm">
            Small
          </AethelButton>
          <AethelButton variant="primary" size="lg" glow>
            Large + Glow
          </AethelButton>
          <AethelButton variant="primary" loading>
            Loading
          </AethelButton>
          <AethelButton variant="primary" disabled>
            Disabled
          </AethelButton>
        </div>
      </section>

      <section style={{ marginBottom: tokens.spacing['8'] }}>
        <h2
          style={{
            fontSize: tokens.typography.fontSize['2xl'],
            fontWeight: tokens.typography.fontWeight.semibold,
            marginBottom: tokens.spacing['6'],
          }}
        >
          Form Inputs
        </h2>
        <div
          style={{
            maxWidth: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing['4'],
          }}
        >
          <AethelInput
            label="Email"
            placeholder="user@example.com"
            hint="We'll never share your email"
          />
          <AethelInput
            label="Password"
            type="password"
            placeholder="Enter password"
            error="Password must be at least 8 characters"
          />
        </div>
      </section>

      <section style={{ marginBottom: tokens.spacing['8'] }}>
        <h2
          style={{
            fontSize: tokens.typography.fontSize['2xl'],
            fontWeight: tokens.typography.fontWeight.semibold,
            marginBottom: tokens.spacing['6'],
          }}
        >
          Toasts and Status
        </h2>
        <div style={{ display: 'flex', gap: tokens.spacing['4'], flexWrap: 'wrap' }}>
          <AethelButton variant="primary" onClick={() => success('Saved', 'Project updated')}>
            Success toast
          </AethelButton>
          <AethelButton variant="secondary" onClick={() => warning('Heads up', 'Review this state')}>
            Warning toast
          </AethelButton>
          <AethelButton variant="ghost" onClick={() => info('Syncing', 'Realtime channel connected')}>
            Info toast
          </AethelButton>
          <AethelButton variant="danger" onClick={() => error('Failed', 'Retry in a few seconds')}>
            Error toast
          </AethelButton>
          <AethelButton variant="primary" onClick={handlePromiseDemo}>
            Promise toast
          </AethelButton>
        </div>
        <div style={{ display: 'flex', gap: tokens.spacing['3'], marginTop: tokens.spacing['5'] }}>
          <StatusIndicator status="online" label="Online" />
          <StatusIndicator status="busy" label="Warning" />
          <StatusIndicator status="error" label="Error" />
        </div>
      </section>

      <section style={{ marginBottom: tokens.spacing['8'] }}>
        <h2
          style={{
            fontSize: tokens.typography.fontSize['2xl'],
            fontWeight: tokens.typography.fontWeight.semibold,
            marginBottom: tokens.spacing['6'],
          }}
        >
          Skeletons
        </h2>
        <div style={{ display: 'grid', gap: tokens.spacing['4'], maxWidth: '560px' }}>
          <Skeleton height={18} />
          <Skeleton height={18} width="80%" />
          <Skeleton height={72} />
        </div>
      </section>

      <section style={{ marginBottom: tokens.spacing['8'] }}>
        <h2
          style={{
            fontSize: tokens.typography.fontSize['2xl'],
            fontWeight: tokens.typography.fontWeight.semibold,
            marginBottom: tokens.spacing['6'],
          }}
        >
          Mobile Interactions
        </h2>
        <div style={{ display: 'flex', gap: tokens.spacing['4'], flexWrap: 'wrap' }}>
          <AethelButton variant="secondary" leftIcon={<Layout size={16} />} onClick={() => setSidebarOpen(true)}>
            Swipeable panel
          </AethelButton>
          <AethelButton variant="secondary" leftIcon={<MessageSquare size={16} />} onClick={() => setShowBottomSheet(true)}>
            Bottom sheet
          </AethelButton>
          <AethelButton variant="secondary" leftIcon={<Play size={16} />} onClick={() => setShowMobileNav(true)}>
            Mobile nav
          </AethelButton>
        </div>
      </section>

      <section style={{ marginBottom: tokens.spacing['8'] }}>
        <h2
          style={{
            fontSize: tokens.typography.fontSize['2xl'],
            fontWeight: tokens.typography.fontWeight.semibold,
            marginBottom: tokens.spacing['6'],
          }}
        >
          Tooltips
        </h2>
        <div style={{ display: 'flex', gap: tokens.spacing['4'], flexWrap: 'wrap' }}>
          <Tooltip content="Quick prompt for AI actions">
            <AethelButton variant="ghost" leftIcon={<Bot size={16} />}>
              AI Actions
            </AethelButton>
          </Tooltip>
          <Tooltip content="Deploy runtime health">
            <AethelButton variant="ghost" leftIcon={<Zap size={16} />}>
              Runtime
            </AethelButton>
          </Tooltip>
          <Tooltip content="Security readiness">
            <AethelButton variant="ghost" leftIcon={<Shield size={16} />}>
              Trust
            </AethelButton>
          </Tooltip>
        </div>
      </section>

      <SwipeablePanel isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <div style={{ padding: tokens.spacing['6'] }}>
          <h3 style={{ fontSize: tokens.typography.fontSize.xl, marginBottom: tokens.spacing['3'] }}>
            Swipeable panel
          </h3>
          <p style={{ color: TEXT_SECONDARY }}>
            This panel mirrors the dense workbench side surfaces we want across the product.
          </p>
        </div>
      </SwipeablePanel>

      <BottomSheet isOpen={showBottomSheet} onClose={() => setShowBottomSheet(false)}>
        <div style={{ padding: tokens.spacing['6'] }}>
          <h3 style={{ fontSize: tokens.typography.fontSize.xl, marginBottom: tokens.spacing['3'] }}>
            Bottom sheet
          </h3>
          <p style={{ color: TEXT_SECONDARY }}>
            Great for mobile-first project actions, contextual prompts, and billing callouts.
          </p>
        </div>
      </BottomSheet>

      {showMobileNav ? (
        <MobileNavBar
          items={[
            {
              id: 'chat',
              label: 'Chat',
              icon: <MessageSquare size={18} />,
              onClick: () => setShowMobileNav(false),
            },
            {
              id: 'build',
              label: 'Build',
              icon: <Code2 size={18} />,
              onClick: () => setShowMobileNav(false),
            },
            {
              id: 'ship',
              label: 'Ship',
              icon: <Send size={18} />,
              onClick: () => setShowMobileNav(false),
            },
            {
              id: 'agents',
              label: 'Agents',
              icon: <Bot size={18} />,
              onClick: () => setShowMobileNav(false),
            },
            {
              id: 'next',
              label: 'Next',
              icon: <ChevronRight size={18} />,
              onClick: () => setShowMobileNav(false),
            },
          ]}
        />
      ) : null}
    </div>
  )
}

export default function DesignSystemDemoContentPage() {
  return (
    <CoreUiProviders>
      <DesignSystemDemoBody />
    </CoreUiProviders>
  )
}
