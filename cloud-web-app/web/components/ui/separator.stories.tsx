import type { Meta, StoryObj } from '@storybook/react'
import { Separator } from './separator'

const meta: Meta<typeof Separator> = {
  title: 'UI/Separator',
  component: Separator,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Separator>

export const SectionBreak: Story = {
  render: () => (
    <div className="w-80 text-sm text-[var(--aethel-text-secondary)]">
      <p>Mission plan</p>
      <Separator />
      <p>Evidence and rollback</p>
    </div>
  ),
}
