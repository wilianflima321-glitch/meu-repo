import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const studioRuntimeRouteLayoutSpy = vi.fn(
  ({
    children,
    onboardingChrome,
  }: {
    children: React.ReactNode;
    onboardingChrome?: boolean;
  }) => (
    <div
      data-testid="studio-runtime-route-layout"
      data-onboarding-chrome={String(onboardingChrome)}
    >
      {children}
    </div>
  )
);

vi.mock('@/components/providers/StudioRuntimeRouteLayout', () => ({
  default: (props: {
    children: React.ReactNode;
    onboardingChrome?: boolean;
  }) => studioRuntimeRouteLayoutSpy(props),
}));

import RouteLayout from '@/app/dashboard/layout';

describe('dashboard RouteLayout', () => {
  afterEach(() => {
    studioRuntimeRouteLayoutSpy.mockClear();
  });

  it('suppresses onboarding chrome for dashboard runtime surfaces', () => {
    render(
      <RouteLayout>
        <div>Dashboard content</div>
      </RouteLayout>
    );

    expect(studioRuntimeRouteLayoutSpy).toHaveBeenCalledTimes(1);
    expect(studioRuntimeRouteLayoutSpy.mock.calls[0]?.[0]).toMatchObject({
      onboardingChrome: false,
    });
    expect(screen.getByTestId('studio-runtime-route-layout')).toHaveAttribute(
      'data-onboarding-chrome',
      'false'
    );
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });
});
