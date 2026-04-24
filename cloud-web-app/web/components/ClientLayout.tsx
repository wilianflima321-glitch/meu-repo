'use client';

import { useEffect } from 'react';
import { createCSSCustomProperties } from '../lib/design-system';
import { ThemeProvider } from '../contexts/ThemeContext'
import { ToastProvider } from './ui/toast-system'

interface ClientLayoutProps {
  children: React.ReactNode;
}

function BaseProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  useEffect(() => {
    // Initialize design system CSS custom properties
    createCSSCustomProperties();
  }, []);

  return <BaseProviders>{children}</BaseProviders>;
}
