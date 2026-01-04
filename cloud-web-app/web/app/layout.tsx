import '../styles/globals.css'
import type { ReactNode } from 'react'
import ClientLayout from '../components/ClientLayout'

export const metadata = {
  title: 'Aethel IDE - Professional Development Environment',
  description: 'Advanced IDE with AI assistance, Unreal Engine integration, and professional development tools'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased">
        <div id="root" className="min-h-screen bg-slate-900 text-slate-100">
          <ClientLayout>
            {children}
          </ClientLayout>
        </div>
      </body>
    </html>
  )
}





