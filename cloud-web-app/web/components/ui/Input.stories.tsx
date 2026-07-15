import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  args: { label: 'Mission name', placeholder: 'Open-world prototype' },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {}
export const WithHint: Story = { args: { hint: 'This name appears in Mission Ledger and deploy evidence.' } }
export const Error: Story = { args: { error: 'A mission name is required.' } }
export const Success: Story = { args: { success: 'Ready to create mission.' } }
