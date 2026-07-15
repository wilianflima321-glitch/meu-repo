import type { Meta, StoryObj } from '@storybook/react'
import { Tabs, TabList, TabTrigger, TabContent } from './Tabs'

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Tabs>

export const StudioModes: Story = {
  render: () => (
    <Tabs defaultValue="mission" className="w-[520px]">
      <TabList>
        <TabTrigger value="mission">Mission</TabTrigger>
        <TabTrigger value="preview">Preview</TabTrigger>
        <TabTrigger value="evidence">Evidence</TabTrigger>
      </TabList>
      <TabContent value="mission">Mission plan and scope locks are visible here.</TabContent>
      <TabContent value="preview">Viewport, web preview, or film frame goes here.</TabContent>
      <TabContent value="evidence">Artifacts, checks, and rollback notes.</TabContent>
    </Tabs>
  ),
}
