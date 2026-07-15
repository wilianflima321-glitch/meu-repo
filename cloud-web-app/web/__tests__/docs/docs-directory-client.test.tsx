import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Rocket } from 'lucide-react'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={typeof href === 'string' ? href : '#'} {...props}>
      {children}
    </a>
  ),
}))

import DocsDirectoryClient from '@/app/docs/docs-directory-client'

const sections = [
  {
    title: 'Primeiros passos',
    description: 'Entrada inicial do studio.',
    icon: Rocket,
    color: 'text-success',
    bgColor: 'bg-success',
    href: '/docs/getting-started',
    items: [
      {
        title: 'Comecar pelo studio',
        href: '/docs/getting-started',
        summary: 'Fluxo inicial para onboarding.',
      },
    ],
  },
  {
    title: 'Referencia da API',
    description: 'Contratos publicos.',
    icon: Rocket,
    color: 'text-info',
    bgColor: 'bg-info',
    href: '/docs/api',
    items: [
      {
        title: 'Endpoints e contratos',
        href: '/docs/api',
        summary: 'Superficies operacionais.',
      },
    ],
  },
]

const quickLinks = [
  {
    title: 'Workbench do IDE',
    href: '/docs/ide',
    summary: 'Como chat, editor e preview convivem.',
  },
  {
    title: 'API e readiness operacional',
    href: '/docs/api',
    summary: 'Onde olhar health checks.',
  },
]

describe('DocsDirectoryClient', () => {
  it('filters sections and quick links from the search query', () => {
    render(<DocsDirectoryClient sections={sections} quickLinks={quickLinks} />)

    expect(screen.getByText(/2 sections/i)).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText(/Search docs/i), {
      target: { value: 'api' },
    })

    expect(screen.getByText(/1 sections and 1 results for "api"/i)).toBeInTheDocument()
    expect(screen.getByText('Referencia da API')).toBeInTheDocument()
    expect(screen.queryByText('Primeiros passos')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Clear search/i })).toBeInTheDocument()
  })
})
