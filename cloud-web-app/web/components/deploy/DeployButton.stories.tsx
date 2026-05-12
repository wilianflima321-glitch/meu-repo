import type { Meta, StoryObj } from '@storybook/react'
import { DeployButton } from './DeployButton'

const meta: Meta<typeof DeployButton> = {
  title: 'Deploy/DeployButton',
  component: DeployButton,
  tags: ['autodocs'],
  args: {
    projectName: 'aethel-demo',
    projectId: 'project-demo',
    openStatusOnStart: false,
    showFeedback: false,
  },
}

export default meta
type Story = StoryObj<typeof DeployButton>

export const Compact: Story = { args: { density: 'compact' } }
export const Comfortable: Story = { args: { density: 'comfortable', label: 'Publish preview' } }
