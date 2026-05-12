import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardDescription, CardHeader, CardTitle } from './Card'
import { Badge } from './Badge'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  args: { variant: 'default', padding: 'md' },
}

export default meta
type Story = StoryObj<typeof Card>

export const MissionCard: Story = {
  render: (args) => (
    <Card {...args} className="max-w-md">
      <CardHeader title="Viewport render" description="Queued with evidence gates and runtime safety." action={<Badge variant="success">Ready</Badge>} />
      <CardTitle>Scene preview is protected</CardTitle>
      <CardDescription>Artifacts require owner checks before they are shared outside the project.</CardDescription>
    </Card>
  ),
}

export const Glow: Story = {
  args: { variant: 'glow', hoverable: true },
  render: (args) => <Card {...args} className="max-w-md">Agent fleet handoff packet ready.</Card>,
}
