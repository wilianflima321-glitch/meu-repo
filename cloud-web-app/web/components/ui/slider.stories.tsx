import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Slider } from './slider'

function RenderQualityExample() {
  const [value, setValue] = useState([64])
  return (
    <div className="w-80 space-y-2">
      <Slider value={value} onValueChange={setValue} min={1} max={100} />
      <p className="text-xs text-[var(--aethel-text-tertiary)]">Quality: {value[0]}%</p>
    </div>
  )
}

const meta: Meta<typeof Slider> = {
  title: 'UI/Slider',
  component: Slider,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Slider>

export const RenderQuality: Story = { render: () => <RenderQualityExample /> }
