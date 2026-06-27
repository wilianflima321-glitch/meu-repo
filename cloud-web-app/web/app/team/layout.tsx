import type { ReactNode } from 'react';
import StudioRuntimeRouteLayout from '@/components/providers/StudioRuntimeRouteLayout';

export default function TeamLayout({ children }: { children: ReactNode }) {
  return (
    <StudioRuntimeRouteLayout surface="light" onboardingChrome={false}>
      {children}
    </StudioRuntimeRouteLayout>
  );
}
