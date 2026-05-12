import type { Meta, StoryObj } from '@storybook/react'
import PublicFooter from './PublicFooter'

const meta: Meta<typeof PublicFooter> = {
  title: 'UI/PublicFooter',
  component: PublicFooter,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof PublicFooter>

export const Default: Story = {}
