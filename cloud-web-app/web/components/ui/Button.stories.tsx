import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Run mission' },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = { args: { variant: 'primary', children: 'Run mission' } }
export const Secondary: Story = { args: { variant: 'secondary', children: 'Review evidence' } }
export const Ghost: Story = { args: { variant: 'ghost', children: 'Cancel' } }
export const Danger: Story = { args: { variant: 'danger', children: 'Stop job' } }
export const Loading: Story = { args: { loading: true, children: 'Starting' } }
