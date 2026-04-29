import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const studioRuntimeRouteLayoutSpy = vi.fn(
  ({
    children,
    onboardingChrome,
    surface,
  }: {
    children: React.ReactNode;
    onboardingChrome?: boolean;
    surface?: 'full' | 'light';
  }) => (
    <div
      data-testid="studio-runtime-route-layout"
      data-onboarding-chrome={String(onboardingChrome)}
      data-surface={surface ?? 'full'}
    >
      {children}
    </div>
  )
);

vi.mock('@/components/providers/StudioRuntimeRouteLayout', () => ({
  default: (props: {
    children: React.ReactNode;
    onboardingChrome?: boolean;
    surface?: 'full' | 'light';
  }) => studioRuntimeRouteLayoutSpy(props),
}));

import RouteLayout from '@/app/dashboard/layout';

describe('dashboard RouteLayout', () => {
  afterEach(() => {
    studioRuntimeRouteLayoutSpy.mockClear();
  });

  it('keeps dashboard on the lightweight runtime surface without onboarding chrome', () => {
    render(
      <RouteLayout>
        <div>Dashboard content</div>
      </RouteLayout>
    );

    expect(studioRuntimeRouteLayoutSpy).toHaveBeenCalledTimes(1);
    expect(studioRuntimeRouteLayoutSpy.mock.calls[0]?.[0]).toMatchObject({
      onboardingChrome: false,
      surface: 'light',
    });
    expect(screen.getByTestId('studio-runtime-route-layout')).toHaveAttribute(
      'data-onboarding-chrome',
      'false'
    );
    expect(screen.getByTestId('studio-runtime-route-layout')).toHaveAttribute(
      'data-surface',
      'light'
    );
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });
});
