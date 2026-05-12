import type { Meta, StoryObj } from '@storybook/react'
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog'

const meta: Meta<typeof KeyboardShortcutsDialog> = {
  title: 'IDE/KeyboardShortcutsDialog',
  component: KeyboardShortcutsDialog,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof KeyboardShortcutsDialog>

export const Open: Story = { args: { isOpen: true, onClose: () => undefined } }
