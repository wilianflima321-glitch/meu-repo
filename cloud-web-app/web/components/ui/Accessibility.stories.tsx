import type { Meta, StoryObj } from '@storybook/react'
import { FocusTrap, IconButton, LiveRegion, SkipToContent, VisuallyHidden } from './Accessibility'

const meta: Meta<typeof SkipToContent> = {
  title: 'UI/Accessibility',
  component: SkipToContent,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SkipToContent>

export const SkipLinks: Story = { args: { links: [{ href: '#main', label: 'Skip to main content' }] } }
export const LiveStatus: Story = { render: () => <LiveRegion message="Render evidence is ready." /> }
export const FocusTrapPreview: Story = {
  render: () => (
    <FocusTrap active={false}>
      <button type="button">First focus target</button>
      <button type="button">Second focus target</button>
    </FocusTrap>
  ),
}
export const HiddenLabelButton: Story = {
  render: () => (
    <IconButton label="Open command palette">
      <VisuallyHidden>Open command palette</VisuallyHidden>
      <span aria-hidden="true">K</span>
    </IconButton>
  ),
}
