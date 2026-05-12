import type { Meta, StoryObj } from '@storybook/react'
import PublicHeader from './PublicHeader'

const meta: Meta<typeof PublicHeader> = {
  title: 'UI/PublicHeader',
  component: PublicHeader,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof PublicHeader>

export const Default: Story = {}
