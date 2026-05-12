import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Select } from './Select'

const options = [
  { value: 'local-native', label: 'Local native', description: 'Use Studio Local sidecar when safe.' },
  { value: 'cloud-sandbox', label: 'Cloud sandbox', description: 'Move heavy work away from weak devices.' },
  { value: 'held', label: 'Held', description: 'Wait for approval or better runtime conditions.' },
]

function RuntimeTargetExample() {
  const [value, setValue] = useState('local-native')
  return <Select label="Runtime target" options={options} value={value} onChange={setValue} searchable />
}

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Select>

export const RuntimeTarget: Story = { render: () => <RuntimeTargetExample /> }
