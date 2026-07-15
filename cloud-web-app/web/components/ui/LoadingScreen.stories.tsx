import type { Meta, StoryObj } from '@storybook/react'
import { InlineLoader, PageLoader } from './LoadingScreen'

const meta: Meta<typeof PageLoader> = {
  title: 'UI/LoadingStates',
  component: PageLoader,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof PageLoader>

export const Page: Story = { args: { text: 'Loading Studio Mission Control...' } }
export const Inline: Story = { render: () => <InlineLoader size="md" /> }
