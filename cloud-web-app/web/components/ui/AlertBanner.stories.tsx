import type { Meta, StoryObj } from '@storybook/react';
import { AlertBanner, AlertBannerCompact } from './AlertBanner';
import { Button } from './Button';

const meta: Meta<typeof AlertBanner> = {
  title: 'UI/AlertBanner',
  component: AlertBanner,
};
export default meta;

type Story = StoryObj<typeof AlertBanner>;

export const Error: Story = {
  args: {
    variant: 'error',
    title: 'Authentication Failed',
    children: 'Your session has expired. Please sign in again to continue.',
    dismissible: true,
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Billing Issue',
    children: 'Your payment method will expire soon. Update your billing details.',
    dismissible: true,
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    title: 'New Feature Available',
    children: 'Visual Scripting Editor now supports GPU compute nodes.',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Project Published',
    children: 'Your game build has been deployed to the cloud successfully.',
    dismissible: true,
  },
};

export const WithActions: Story = {
  args: {
    variant: 'warning',
    title: 'Unsaved Changes',
    children: 'You have unsaved changes in 3 files.',
    actions: (
      <>
        <Button variant="ghost" size="sm">Discard</Button>
        <Button variant="primary" size="sm">Save All</Button>
      </>
    ),
  },
};

export const Compact: StoryObj<typeof AlertBannerCompact> = {
  render: () => (
    <div className="flex flex-col gap-2">
      <AlertBannerCompact variant="error">Build failed with 3 errors</AlertBannerCompact>
      <AlertBannerCompact variant="warning">2 deprecation warnings</AlertBannerCompact>
      <AlertBannerCompact variant="info">TypeScript strict mode enabled</AlertBannerCompact>
      <AlertBannerCompact variant="success">All 142 tests passed</AlertBannerCompact>
    </div>
  ),
};
