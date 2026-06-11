/**
 * Auth surface stories — login, register, forgot password.
 * All states captured for visual regression.
 * No live API calls; Turnstile is skipped in Storybook.
 */
import type { Meta, StoryObj } from '@storybook/react'
import AuthExperiencePanel from '@/components/auth/AuthExperiencePanel'

// ─── AuthExperiencePanel stories ──────────────────────────────────────────────
// The right-hand panel on auth pages

const panelMeta = {
  title: 'Auth/AuthExperiencePanel',
  component: AuthExperiencePanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Right-hand experience panel on auth pages. Shows value proof without marketing copy.',
      },
    },
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div style={{ height: '100vh', background: 'var(--aethel-surface-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '460px' }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof AuthExperiencePanel>

export default panelMeta

type Story = StoryObj<typeof panelMeta>

export const LoginPanel: Story = {
  name: 'Login — experience panel',
  args: {
    eyebrow: 'Operational access',
    domainLabel: 'Apps + Research',
    title: 'Enter once. Keep moving.',
    description: 'Sign in, reopen the workspace, and continue from the latest activity.',
    highlights: [
      'Dashboard, IDE, preview, and activity stay connected.',
      'Agents wait for authenticated context before acting.',
    ],
    stats: [
      { value: '1', label: 'studio flow' },
      { value: '20+', label: 'agents' },
      { value: 'Live', label: 'activity' },
    ],
  },
}

export const RegisterPanel: Story = {
  name: 'Register — experience panel',
  args: {
    eyebrow: 'New workspace',
    domainLabel: 'Start here',
    title: 'Start with one action.',
    description: 'Create a project, invite the agents, ship. The workspace builds around you.',
    highlights: [
      'No configuration required to start.',
      'First agent runs in under two minutes.',
    ],
    stats: [
      { value: '< 2m', label: 'first run' },
      { value: 'Free', label: 'to start' },
      { value: '∞', label: 'projects' },
    ],
  },
}

export const ResetPanel: Story = {
  name: 'Reset — experience panel',
  args: {
    eyebrow: 'Account recovery',
    domainLabel: 'Secure access',
    title: 'Back in seconds.',
    description: 'Check your email for the link. No support ticket needed.',
    highlights: [
      'One-time link expires in 15 minutes.',
      'Switch to passkey after reset to avoid this.',
    ],
    stats: [
      { value: '15m', label: 'link expiry' },
      { value: 'TOTP', label: 'supported' },
    ],
  },
}
