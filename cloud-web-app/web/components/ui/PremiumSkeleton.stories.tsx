import type { Meta, StoryObj } from '@storybook/react'
import { PremiumCardSkeleton, StatsSkeleton, TimelineSkeleton } from './PremiumSkeleton'

const meta: Meta<typeof PremiumCardSkeleton> = {
  title: 'UI/PremiumSkeleton',
  component: PremiumCardSkeleton,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof PremiumCardSkeleton>

export const Card: Story = { args: { lines: 3, actions: 2 } }
export const Stats: Story = { render: () => <StatsSkeleton count={4} /> }
export const Timeline: Story = { render: () => <TimelineSkeleton items={4} /> }
