import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './Badge'

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'Ready' },
}

export default meta
type Story = StoryObj<typeof Badge>

export const StatusSet: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success" dot>Ready</Badge>
      <Badge variant="warning" dot>Needs review</Badge>
      <Badge variant="error" dot>Blocked</Badge>
      <Badge variant="info" dot>Running</Badge>
      <Badge variant="primary">P0</Badge>
    </div>
  ),
}
