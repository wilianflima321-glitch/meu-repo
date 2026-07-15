import type { Meta, StoryObj } from '@storybook/react'
import { VirtualList, type VirtualListItem } from './VirtualList'

type DemoItem = VirtualListItem & { label: string; detail: string }

const items: DemoItem[] = Array.from({ length: 100 }, (_, index) => ({
  id: `item-${index}`,
  label: `Asset ${index + 1}`,
  detail: index % 3 === 0 ? 'High poly mesh' : 'Runtime-safe proxy',
}))

const meta: Meta<typeof VirtualList<DemoItem>> = {
  title: 'UI/VirtualList',
  component: VirtualList<DemoItem>,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof VirtualList<DemoItem>>

export const AssetCatalog: Story = {
  render: () => (
    <VirtualList
      items={items}
      itemHeight={48}
      height={260}
      renderItem={(item, _index, style) => (
        <div style={style} className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-3 text-sm">
          <span className="font-medium text-[var(--aethel-text-primary)]">{item.label}</span>
          <span className="text-[var(--aethel-text-tertiary)]">{item.detail}</span>
        </div>
      )}
    />
  ),
}
