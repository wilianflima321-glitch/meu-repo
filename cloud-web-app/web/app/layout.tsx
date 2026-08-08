import { tokenColor } from '@/lib/design-system/DesignTokenSync'
import './globals.css'
import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import GlobalCommandSurface from '@aethel/ide-ui/GlobalCommandSurface'
import CoreUiProviders from '@/components/providers/CoreUiProviders'
import ProductTelemetry from '@/components/telemetry/ProductTelemetry'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: tokenColor('--aethel-browser-theme-light') },
    { media: '(prefers-color-scheme: dark)', color: tokenColor('--aethel-browser-theme-dark') },
  ],
}

export const metadata: Metadata = {
  title: 'Aethel Engine - multi-agent software studio',
  description: 'Multi-agent studio for apps, research, and AI-assisted software work with explicit operations.',
  metadataBase: new URL('https://aethel.dev'),
  keywords: ['multi-agent IDE', 'AI software studio', 'research to code', 'apps IDE', 'Aethel Engine', 'anti-fake-success'],
  authors: [{ name: 'Aethel Engine Team' }],
  creator: 'Aethel Engine',
  publisher: 'Aethel Engine',
  manifest: '/manifest.webmanifest',
  other: {
    'mobile-web-app-capable': 'yes',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aethel Engine',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://aethel.dev',
    siteName: 'Aethel Engine',
    title: 'Aethel Engine - multi-agent software studio',
    description: 'Research, planning, code, preview, and receipts in one AI-assisted studio.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Aethel Engine preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aethel Engine',
    description: 'Multi-agent studio for apps and research',
    images: ['/twitter-image.png'],
  },
  icons: {
    icon: [
      { url: '/branding/aethel-mark.svg', type: 'image/svg+xml' },
      { url: '/icons/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180' },
      { url: '/icons/icon-192x192.png', sizes: '192x192' },
    ],
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen antialiased bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
        <CoreUiProviders>
          <ProductTelemetry />
          <GlobalCommandSurface>{children as any}</GlobalCommandSurface>
        </CoreUiProviders>
      </body>
    </html>
  )
}
