'use client'

/**
 * Design System Demo Page
 * Showcase of new Aethel UI components and design tokens
 */

import React from 'react'
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
import { tokens, gradients } from '@/lib/design-tokens'
import {
  MobileNavBar,
  SwipeablePanel,
  BottomSheet,
} from '@/components/ui/mobile-gestures'
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

export default function DesignSystemDemo() {
  const { success, error, warning, info, promise } = useToastActions()
  const [showMobileNav, setShowMobileNav] = React.useState(false)
  const [showBottomSheet, setShowBottomSheet] = React.useState(false)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const handlePromiseDemo = () => {
    promise(
      new Promise((resolve) => setTimeout(() => resolve('Data loaded!'), 2000)),
      {
        loading: 'Loading data...',
        success: (data) => `Success: ${data}`,
        error: (err) => `Error: ${err.message}`,
      }
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: tokens.colors.bg.primary,
        color: tokens.colors.text.primary,
        fontFamily: tokens.typography.fontFamily.sans,
        padding: tokens.spacing['8'],
      }}
    >
      {/* Header */}
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
        <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.lg }}>
          Modern components with glassmorphism, unified tokens, and mobile-first gestures
        </p>
      </GlassPanel>

      <Divider style={{ margin: `${tokens.spacing['8']} 0` }} />

      {/* Glass Panels */}
      <section style={{ marginBottom: tokens.spacing['8'] }}>
        <h2
          style={{
            fontSize: tokens.typography.fontSize['2xl'],
            fontWeight: tokens.typography.fontWeight.semibold,
            marginBottom: tokens.spacing['6'],
            color: tokens.colors.text.primary,
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
            <h3 style={{ marginBottom: tokens.spacing['2'], color: tokens.colors.text.secondary }}>
              Subtle
            </h3>
            <p style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.text.muted }}>
              Light glass effect for secondary content
            </p>
          </GlassPanel>

          <GlassPanel variant="medium" padding="md" glow="cyan">
            <h3 style={{ marginBottom: tokens.spacing['2'], color: tokens.colors.accent.cyan }}>
              Medium + Glow
            </h3>
            <p style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.text.muted }}>
              Medium glass with cyan glow effect
            </p>
          </GlassPanel>

          <GlassPanel variant="strong" padding="md" glow="indigo">
            <h3 style={{ marginBottom: tokens.spacing['2'], color: tokens.colors.accent.indigo }}>
              Strong + Indigo
            </h3>
            <p style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.text.muted }}>
              Strong glass with indigo accent
            </p>
          </GlassPanel>
        </div>
      </section>

      {/* Glow Badges */}
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

      {/* Buttons */}
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

      {/* Form Inputs */}
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
        <div style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: tokens.spacing['4'] }}>
          <AethelInput label="Email" placeholder="user@example.com" hint="We'll never share your email" />
          <AethelInput
            label="Password"
            type="password"
            placeholder="••••••••"
            error="Password must be at least 8 characters"
          />
          <AethelInput label="Search" placeholder="Search files..." leftIcon={<Zap size={16} />} />
        </div>
      </section>

      {/* Status Indicators */}
      <section style={{ marginBottom: tokens.spacing['8'] }}>
        <h2
          style={{
            fontSize: tokens.typography.fontSize['2xl'],
            fontWeight: tokens.typography.fontWeight.semibold,
            marginBottom: tokens.spacing['6'],
          }}
        >
          Status Indicators
        </h2>
        <div style={{ display: 'flex', gap: tokens.spacing['6'], flexWrap: 'wrap' }}>
          <StatusIndicator status="online" label="System Online" pulse />
          <StatusIndicator status="offline" label="Disconnected" />
          <StatusIndicator status="busy" label="Processing" pulse />
          <StatusIndicator status="away" label="Away" />
          <StatusIndicator status="error" label="Error" pulse />
        </div>
      </section>

      {/* Skeleton Loading */}
      <section style={{ marginBottom: tokens.spacing['8'] }}>
        <h2
          style={{
            fontSize: tokens.typography.fontSize['2xl'],
            fontWeight: tokens.typography.fontWeight.semibold,
            marginBottom: tokens.spacing['6'],
          }}
        >
          Skeleton Loading
        </h2>
        <GlassPanel variant="medium" padding="md" style={{ maxWidth: '300px' }}>
          <Skeleton style={{ width: '60%', height: '1.5rem', marginBottom: tokens.spacing['3'] }} />
          <Skeleton style={{ width: '100%', height: '0.875rem', marginBottom: tokens.spacing['2'] }} />
          <Skeleton style={{ width: '80%', height: '0.875rem' }} />
        </GlassPanel>
      </section>

      <Divider style={{ margin: `${tokens.spacing['8']} 0` }} />

      {/* Toast Demo */}
      <section style={{ marginBottom: tokens.spacing['8'] }}>
        <h2
          style={{
            fontSize: tokens.typography.fontSize['2xl'],
            fontWeight: tokens.typography.fontWeight.semibold,
            marginBottom: tokens.spacing['6'],
          }}
        >
          Toast Notifications
        </h2>
        <div style={{ display: 'flex', gap: tokens.spacing['3'], flexWrap: 'wrap' }}>
          <AethelButton variant="primary" onClick={() => success('Operation completed successfully!')}>
            Success Toast
          </AethelButton>
          <AethelButton variant="danger" onClick={() => error('Something went wrong!', 'Error')}>
            Error Toast
          </AethelButton>
          <AethelButton variant="secondary" onClick={() => warning('Please review your input')}>
            Warning Toast
          </AethelButton>
          <AethelButton variant="ghost" onClick={() => info('New update available', 'Info')}>
            Info Toast
          </AethelButton>
          <AethelButton variant="primary" onClick={handlePromiseDemo}>
            Promise Toast
          </AethelButton>
        </div>
      </section>

      <Divider style={{ margin: `${tokens.spacing['8']} 0` }} />

      {/* Mobile Components */}
      <section style={{ marginBottom: tokens.spacing['8'] }}>
        <h2
          style={{
            fontSize: tokens.typography.fontSize['2xl'],
            fontWeight: tokens.typography.fontWeight.semibold,
            marginBottom: tokens.spacing['6'],
          }}
        >
          Mobile Components
        </h2>

        <div style={{ display: 'flex', gap: tokens.spacing['4'], flexWrap: 'wrap', marginBottom: tokens.spacing['6'] }}>
          <AethelButton variant="primary" onClick={() => setShowMobileNav(!showMobileNav)}>
            Toggle Mobile Nav
          </AethelButton>
          <AethelButton variant="secondary" onClick={() => setSidebarOpen(true)}>
            Open Sidebar
          </AethelButton>
          <AethelButton variant="ghost" onClick={() => setShowBottomSheet(true)}>
            Open Bottom Sheet
          </AethelButton>
        </div>

        {/* Mobile Nav Preview */}
        {showMobileNav && (
          <div style={{ position: 'relative', height: '100px', marginBottom: tokens.spacing['6'] }}>
            <MobileNavBar
              items={[
                { id: 'files', icon: <Layout size={20} />, label: 'Files', active: true, onClick: () => {} },
                { id: 'editor', icon: <Code2 size={20} />, label: 'Editor', onClick: () => {} },
                { id: 'chat', icon: <MessageSquare size={20} />, label: 'Chat', badge: 3, onClick: () => {} },
                { id: 'preview', icon: <Play size={20} />, label: 'Run', onClick: () => {} },
              ]}
            />
          </div>
        )}

        {/* Swipeable Sidebar */}
        <SwipeablePanel
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          direction="left"
          width="280px"
        >
          <div style={{ padding: tokens.spacing['6'] }}>
            <h3 style={{ marginBottom: tokens.spacing['4'], color: tokens.colors.text.primary }}>
              Project Files
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing['2'] }}>
              {['src/', 'components/', 'app/', 'lib/', 'public/'].map((folder) => (
                <div
                  key={folder}
                  style={{
                    padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
                    borderRadius: tokens.radius.md,
                    color: tokens.colors.text.secondary,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {folder}
                </div>
              ))}
            </div>
          </div>
        </SwipeablePanel>

        {/* Bottom Sheet */}
        <BottomSheet
          isOpen={showBottomSheet}
          onClose={() => setShowBottomSheet(false)}
          title="Settings"
          snapPoints={['25%', '50%']}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing['4'] }}>
            <AethelInput label="Theme" placeholder="Dark" />
            <AethelInput label="Font Size" placeholder="14px" />
            <AethelButton variant="primary" style={{ marginTop: tokens.spacing['4'] }}>
              Save Settings
            </AethelButton>
          </div>
        </BottomSheet>
      </section>

      <Divider style={{ margin: `${tokens.spacing['8']} 0` }} />

      {/* Tooltips */}
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
        <div style={{ display: 'flex', gap: tokens.spacing['6'] }}>
          <Tooltip content="This is a top tooltip" position="top">
            <AethelButton variant="secondary">Hover for Top</AethelButton>
          </Tooltip>
          <Tooltip content="This is a bottom tooltip" position="bottom">
            <AethelButton variant="secondary">Hover for Bottom</AethelButton>
          </Tooltip>
          <Tooltip content="Left tooltip example" position="left">
            <AethelButton variant="secondary">Hover for Left</AethelButton>
          </Tooltip>
          <Tooltip content="Right tooltip example" position="right">
            <AethelButton variant="secondary">Hover for Right</AethelButton>
          </Tooltip>
        </div>
      </section>

      {/* Footer */}
      <GlassPanel variant="subtle" padding="md" style={{ marginTop: tokens.spacing['12'] }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: tokens.spacing['4'],
          }}
        >
          <div style={{ color: tokens.colors.text.muted, fontSize: tokens.typography.fontSize.sm }}>
            Aethel Engine © 2026
          </div>
          <div style={{ display: 'flex', gap: tokens.spacing['4'] }}>
            <GlowBadge color="cyan">v2.1.0</GlowBadge>
            <StatusIndicator status="online" label="All systems operational" />
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}
