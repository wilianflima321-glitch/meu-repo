import type { Meta, StoryObj } from '@storybook/react'
import { Modal } from './Modal'
import { Button } from './Button'

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Modal>

export const ApprovalRequired: Story = {
  args: {
    isOpen: true,
    onClose: () => undefined,
    title: 'Approve browser action',
    description: 'A sensitive action needs human confirmation before the operator continues.',
    children: <p className="text-sm text-[var(--aethel-text-secondary)]">The agent wants to configure a deployment domain.</p>,
    footer: <Button>Approve</Button>,
  },
}
