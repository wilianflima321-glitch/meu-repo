import type { Meta, StoryObj } from '@storybook/react'
import { AIChatCostMeter } from './panels'

const meta: Meta<typeof AIChatCostMeter> = {
  title: 'Agents/Chat/CostMeter',
  component: AIChatCostMeter,
  tags: ['autodocs'],
  args: {
    projectId: 'project-demo',
    currentRunEstimate: 0.018,
    selectedModelName: 'openai/gpt-5.4-mini',
    isAIWorking: false,
    onOpenEconomics: () => undefined,
  },
}

export default meta
type Story = StoryObj<typeof AIChatCostMeter>

export const Ready: Story = {}
export const Running: Story = { args: { isAIWorking: true } }
