import type { Meta, StoryObj } from '@storybook/react'
import { Skeleton, SkeletonCard, SkeletonList, SkeletonTable } from './Skeleton'

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Skeleton>

export const TextLines: Story = { args: { variant: 'text', lines: 4, width: '320px' } }
export const CardPattern: Story = { render: () => <SkeletonCard /> }
export const ListPattern: Story = { render: () => <SkeletonList items={3} /> }
export const TablePattern: Story = { render: () => <SkeletonTable rows={3} /> }
