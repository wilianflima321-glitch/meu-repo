'use client';

import { useEffect } from 'react';
import { createCSSCustomProperties } from '../lib/design-system';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  useEffect(() => {
    // Initialize design system CSS custom properties
    createCSSCustomProperties();
  }, []);

  return <>{children}</>;
}
