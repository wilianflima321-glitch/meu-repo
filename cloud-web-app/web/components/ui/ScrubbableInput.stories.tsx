import type { Meta, StoryObj } from '@storybook/react';
import { ScrubbableInput, Vector3Input } from './ScrubbableInput';
import { useState } from 'react';

const meta: Meta<typeof ScrubbableInput> = {
  title: 'UI/ScrubbableInput',
  component: ScrubbableInput,
};
export default meta;

type Story = StoryObj<typeof ScrubbableInput>;

function DefaultStory() {
  const [value, setValue] = useState(10.5);
  return (
    <ScrubbableInput
      label="X"
      value={value}
      onChange={setValue}
      step={0.1}
      precision={2}
    />
  );
}

function WithSuffixStory() {
  const [value, setValue] = useState(45);
  return (
    <ScrubbableInput
      label="Rot"
      value={value}
      onChange={setValue}
      step={1}
      precision={1}
      suffix="°"
      min={-360}
      max={360}
    />
  );
}

function Vec3Story() {
  const [value, setValue] = useState<[number, number, number]>([0, 1.5, -3.2]);
  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs text-[var(--aethel-text-tertiary)] mb-1 block">Position</span>
        <Vector3Input value={value} onChange={setValue} />
      </div>
      <div>
        <span className="text-xs text-[var(--aethel-text-tertiary)] mb-1 block">Rotation</span>
        <Vector3Input
          value={[0, 90, 0]}
          onChange={() => {}}
          labels={['X', 'Y', 'Z']}
          step={1}
          precision={1}
        />
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <DefaultStory />,
};

export const WithSuffix: Story = {
  render: () => <WithSuffixStory />,
};

export const Vec3: StoryObj<typeof Vector3Input> = {
  render: () => <Vec3Story />,
};
