import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './checkbox'

function EvidenceGateExample() {
  const [checked, setChecked] = useState(true)
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--aethel-text-secondary)]">
      <Checkbox checked={checked} onCheckedChange={setChecked} />
      Require evidence before marking done
    </label>
  )
}

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Checkbox>

export const EvidenceGate: Story = { render: () => <EvidenceGateExample /> }
