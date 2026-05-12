import type { Meta, StoryObj } from '@storybook/react'
import { Avatar } from './Avatar'

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  args: { name: 'Ada Lovelace', status: 'online' },
}

export default meta
type Story = StoryObj<typeof Avatar>

export const Online: Story = {}
export const PresenceStack: Story = {
  render: () => (
    <div className="flex -space-x-2">
      <Avatar name="Ada Lovelace" status="online" />
      <Avatar name="Grace Hopper" status="busy" />
      <Avatar name="Alan Turing" status="away" />
    </div>
  ),
}
