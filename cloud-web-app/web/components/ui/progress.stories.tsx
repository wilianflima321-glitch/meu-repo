import type { Meta, StoryObj } from '@storybook/react'
import { Progress } from './progress'

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  tags: ['autodocs'],
  args: { value: 72 },
}

export default meta
type Story = StoryObj<typeof Progress>

export const RenderQueue: Story = {}
export const CriticalBudget: Story = { args: { value: 94, indicatorClassName: 'bg-[var(--aethel-warning)]' } }
