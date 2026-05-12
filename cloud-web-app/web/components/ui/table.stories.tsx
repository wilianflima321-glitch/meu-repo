import type { Meta, StoryObj } from '@storybook/react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'

const meta: Meta<typeof Table> = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Table>

export const RuntimeMatrix: Story = {
  render: () => (
    <Table className="max-w-xl">
      <TableHeader><TableRow><TableHead>Lane</TableHead><TableHead>Target</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>
        <TableRow><TableCell>viewport-render</TableCell><TableCell>local-native</TableCell><TableCell>Ready</TableCell></TableRow>
        <TableRow><TableCell>browser-operator</TableCell><TableCell>held</TableCell><TableCell>Needs approval</TableCell></TableRow>
      </TableBody>
    </Table>
  ),
}
