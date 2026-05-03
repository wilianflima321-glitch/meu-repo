import './globals.css'
import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import ProductTelemetry from '@/components/telemetry/ProductTelemetry'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d12' },
  ],
}

export const metadata: Metadata = {
  title: 'Aethel Engine - estudio multiagente de software',
  description: 'Estudio multiagente para apps, pesquisa e construcao assistida por IA com operacao explicita.',
  metadataBase: new URL('https://aethel.dev'),
  keywords: ['multi-agent IDE', 'AI software studio', 'research to code', 'apps IDE', 'Aethel Engine', 'anti-fake-success'],
  authors: [{ name: 'Aethel Engine Team' }],
  creator: 'Aethel Engine',
  publisher: 'Aethel Engine',
  manifest: '/manifest.webmanifest',
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
    locale: 'pt_BR',
    url: 'https://aethel.dev',
    siteName: 'Aethel Engine',
    title: 'Aethel Engine - estudio multiagente de software',
    description: 'Pesquisa, planejamento, codigo, preview e prontidao em um unico estudio assistido por IA.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Preview do Aethel Engine',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aethel Engine',
    description: 'Estudio multiagente para apps e pesquisa',
    images: ['/twitter-image.png'],
  },
  icons: {
    icon: [
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
    <html lang="pt-BR" className={`dark ${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen antialiased bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
        <ProductTelemetry />
        {children}
      </body>
    </html>
  )
}

