import type { Meta, StoryObj } from '@storybook/react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog'
import { Button } from './Button'

const meta: Meta<typeof Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Dialog>

export const Open: Story = {
  render: () => (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scope lock conflict</DialogTitle>
          <DialogDescription>Another agent owns this surface. Review the lock before continuing.</DialogDescription>
        </DialogHeader>
        <DialogFooter><Button variant="secondary">Review lock</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}
