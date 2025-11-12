'use client';

import { useEffect } from 'react';
import { createCSSCustomProperties } from '../lib/design-system';
import { I18nextProvider } from 'react-i18next'
import i18n from '../lib/i18n'

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
      {children}
    </I18nextProvider>
  );
}