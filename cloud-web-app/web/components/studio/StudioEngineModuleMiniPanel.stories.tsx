import type { Meta, StoryObj } from '@storybook/react'

import StudioEngineModuleMiniPanel from './StudioEngineModuleMiniPanel'

const meta: Meta<typeof StudioEngineModuleMiniPanel> = {
  title: 'Studio/StudioEngineModuleMiniPanel',
  component: StudioEngineModuleMiniPanel,
  tags: ['autodocs'],
  args: {
    title: 'World runtime modules',
    moduleIds: ['world-streaming', 'terrain-system', 'asset-importer'],
  },
}

export default meta
type Story = StoryObj<typeof StudioEngineModuleMiniPanel>

export const WorldModules: Story = {}

export const FilmModules: Story = {
  args: {
    title: 'Film runtime modules',
    moduleIds: ['audio-manager', 'dialogue-system', 'spatial-audio-system'],
  },
}
