import type { Meta, StoryObj } from '@storybook/react'
import { Textarea } from './Textarea'

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: {
    label: 'Creative brief',
    helperText: 'Keep it short enough for agents to turn into a scoped plan.',
    placeholder: 'Create a cinematic intro with a moonlit city, one hero character, and evidence screenshots.',
  },
}

export default meta
type Story = StoryObj<typeof Textarea>

export const Brief: Story = {}
export const ValidationError: Story = { args: { error: 'Add at least one acceptance criterion.' } }
