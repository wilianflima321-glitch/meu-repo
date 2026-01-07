import '../styles/globals.css'
import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import ClientLayout from '../components/ClientLayout'
import { ServiceWorkerProvider } from '../components/ServiceWorkerProvider'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6366f1' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
}

export const metadata: Metadata = {
  title: 'Aethel Engine - AI-Powered Game Development IDE',
  description: 'Next-generation game development IDE with AI assistance, real-time collaboration, and professional tools for web and desktop.',
  keywords: ['game engine', 'game development', 'IDE', 'AI', 'three.js', 'WebGL', 'game editor'],
  authors: [{ name: 'Aethel Engine Team' }],
  creator: 'Aethel Engine',
  publisher: 'Aethel Engine',
  manifest: '/manifest.json',
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
    title: 'Aethel Engine - AI-Powered Game Development IDE',
    description: 'Next-generation game development IDE with AI assistance and real-time collaboration.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Aethel Engine Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aethel Engine',
    description: 'AI-Powered Game Development IDE',
    images: ['/twitter-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152' },
      { url: '/icons/icon-192x192.png', sizes: '192x192' },
    ],
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased">
        <ServiceWorkerProvider>
          <div id="root" className="min-h-screen bg-slate-900 text-slate-100">
            <ClientLayout>
              {children}
            </ClientLayout>
          </div>
        </ServiceWorkerProvider>
      </body>
    </html>
  )
}





