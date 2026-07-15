import type { Meta, StoryObj } from '@storybook/react'
import PremiumLoadingState from './PremiumLoadingState'

const meta: Meta<typeof PremiumLoadingState> = {
  title: 'UI/PremiumLoadingState',
  component: PremiumLoadingState,
}
export default meta

type Story = StoryObj<typeof PremiumLoadingState>
export const Inline: Story = { args: { variant: 'inline', label: 'Saving...' } }
export const Data: Story = { args: { variant: 'data', label: 'Loading data' } }
export const Route: Story = { args: { variant: 'route', label: 'Loading workspace' } }
export const Splash: Story = {
  args: { variant: 'splash', label: 'Starting Aethel', showProgress: true, estimatedMs: 4000 },
}
