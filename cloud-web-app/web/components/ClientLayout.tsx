'use client';

import { useEffect } from 'react';
import { createCSSCustomProperties } from '../lib/design-system';
import { I18nextProvider } from 'react-i18next'
import i18n from '../lib/i18n'
import { AuthProvider } from '../contexts/AuthContext'
import { ErrorBoundaryProvider } from './error/ErrorBoundary'
import { A11yProvider } from '../lib/a11y/accessibility'

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  useEffect(() => {
    // Initialize design system CSS custom properties
    createCSSCustomProperties();
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <ErrorBoundaryProvider>
          <A11yProvider>
            {children}
          </A11yProvider>
        </ErrorBoundaryProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}