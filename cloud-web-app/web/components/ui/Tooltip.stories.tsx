import type { Meta, StoryObj } from '@storybook/react'
import { Tooltip } from './Tooltip'
import { Button } from './Button'

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Tooltip>

export const ExplainEvidence: Story = {
  args: {
    content: 'Evidence is required before a mission can be marked done.',
    children: <Button variant="secondary">Hover for policy</Button>,
  },
}
