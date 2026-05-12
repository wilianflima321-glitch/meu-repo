import type { Meta, StoryObj } from '@storybook/react'
import { Dropdown } from './Dropdown'
import { Button } from './Button'

const meta: Meta<typeof Dropdown> = {
  title: 'UI/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Dropdown>

export const MissionActions: Story = {
  args: {
    trigger: <Button variant="secondary">Mission actions</Button>,
    width: 'md',
    items: [
      { id: 'resume', label: 'Resume session' },
      { id: 'evidence', label: 'Open evidence' },
      { id: 'divider', label: '', divider: true },
      { id: 'stop', label: 'Stop agents', danger: true },
    ],
  },
}
