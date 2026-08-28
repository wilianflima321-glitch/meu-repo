import type { Meta, StoryObj } from '@storybook/react';
import { InlineComposerWidget } from './InlineComposerWidget';

const meta: Meta<typeof InlineComposerWidget> = {
  title: 'Editor/InlineComposerWidget',
  component: InlineComposerWidget,
};
export default meta;

type Story = StoryObj<typeof InlineComposerWidget>;

export const Empty: Story = {
  args: {
    isOpen: true,
    selectedCode: '',
    language: 'typescript',
    filePath: 'lib/engine/physics-engine.ts',
    line: 42,
    onSubmit: async (prompt: string) => {
      await new Promise((r) => setTimeout(r, 1500));
      return `// Generated: ${prompt}`;
    },
    onCancel: () => {},
  },
};

export const WithSelection: Story = {
  args: {
    isOpen: true,
    selectedCode: 'const velocity = new Vector3(0, 0, 0);\nconst acceleration = new Vector3(0, -9.81, 0);',
    language: 'typescript',
    filePath: 'lib/engine/physics-engine.ts',
    line: 108,
    onSubmit: async () => {
      await new Promise((r) => setTimeout(r, 2000));
    },
    onCancel: () => {},
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    selectedCode: '',
    language: 'typescript',
    onSubmit: async () => {},
    onCancel: () => {},
  },
};
