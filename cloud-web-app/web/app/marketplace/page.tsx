'use client'

import { useState, useEffect } from 'react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

interface Extension {
  id: string
  name: string
  displayName: string
  description: string
  version: string
  publisher: string
  icon?: string
  downloads: number
  rating: number
  categories: string[]
  tags: string[]
  repository?: string
  license?: string
  installed: boolean
}

export default function MarketplacePage() {
  const [extensions, setExtensions] = useState<Extension[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'downloads' | 'rating' | 'name'>('downloads')

  const categories = [
    'all',
    'languages',
    'themes',
    'debuggers',
    'formatters',
    'linters',
    'snippets',
    'keymaps',
    'ai-tools',
    'productivity',
  ]

  const categoryLabels: Record<string, string> = {
    all: 'Todos',
    languages: 'Linguagens',
    themes: 'Temas',
    debuggers: 'Depuradores',
    formatters: 'Formatadores',
    linters: 'Linters',
    snippets: 'Snippets',
    keymaps: 'Mapas de teclas',
    'ai-tools': 'Ferramentas de IA',
    productivity: 'Produtividade',
  }

  useEffect(() => {
    loadExtensions()
  }, [])

  const loadExtensions = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch('/api/marketplace/extensions')
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          (data && typeof data === 'object' && 'message' in data && typeof (data as any).message === 'string')
            ? (data as any).message
            : 'Nao foi possivel carregar o marketplace de extensoes.'
        setExtensions([])
        setLoadError(message)
        return
      }

      const next = (data && typeof data === 'object' && Array.isArray((data as any).extensions))
        ? ((data as any).extensions as Extension[])
        : []
      setExtensions(next)
    } catch (error) {
      console.error('Failed to load extensions:', error)
      setExtensions([])
      setLoadError('Falha de rede ao carregar extensoes.')
    } finally {
      setLoading(false)
    }
  }

  const getExtensionBadge = (ext: Extension): string => {
    const base = (ext.displayName || ext.name || '').trim()
    if (!base) return 'EXT'
    const parts = base.split(/\s+/).filter(Boolean)
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
    return initials || base.slice(0, 3).toUpperCase()
  }

  const handleInstall = async (extensionId: string) => {
    try {
      const response = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionId }),
      })

      if (response.ok) {
        setExtensions((prev) =>
          prev.map((ext) =>
            ext.id === extensionId ? { ...ext, installed: true } : ext
          )
        )
      }
    } catch (error) {
      console.error('Failed to install extension:', error)
    }
  }

  const handleUninstall = async (extensionId: string) => {
    try {
      const response = await fetch('/api/marketplace/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionId }),
      })

      if (response.ok) {
        setExtensions((prev) =>
          prev.map((ext) =>
            ext.id === extensionId ? { ...ext, installed: false } : ext
          )
        )
      }
    } catch (error) {
      console.error('Failed to uninstall extension:', error)
    }
  }

  const filteredExtensions = extensions
    .filter((ext) => {
      const matchesSearch =
        ext.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ext.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ext.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCategory =
        selectedCategory === 'all' || ext.categories.includes(selectedCategory)

      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === 'downloads') return b.downloads - a.downloads
      if (sortBy === 'rating') return b.rating - a.rating
      return a.displayName.localeCompare(b.displayName)
    })

  return (
    <div className="min-h-screen bg-black text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-0 h-[600px] w-[600px] rounded-full bg-[color-mix(in_srgb,var(--aethel-accent)_6%,transparent)] blur-[170px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[var(--aethel-primary-dark)]/[0.05] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pt-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-accent)_12%,transparent)] px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-accent-light)]">
            Marketplace
          </div>
          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">Marketplace de extensoes</h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--aethel-text-secondary)]">
            Descubra extensoes para o IDE, agentes e automacoes. Instale direto no studio.
          </p>
        </section>

        <section className="mx-auto mt-10 max-w-6xl px-6">
          {loadError && (
            <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-4">
              <p className="text-[var(--aethel-text-primary)]">{loadError}</p>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Buscar extensoes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] focus:outline-none focus:border-[color-mix(in_srgb,var(--aethel-accent)_60%,transparent)]"
                />
              </div>

              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 text-[var(--aethel-text-primary)] focus:outline-none focus:border-[color-mix(in_srgb,var(--aethel-accent)_60%,transparent)]"
                >
                  <option value="downloads">Mais baixadas</option>
                  <option value="rating">Melhor avaliadas</option>
                  <option value="name">Nome (A-Z)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                    selectedCategory === category
                      ? 'bg-[color-mix(in_srgb,var(--aethel-accent)_20%,transparent)] text-[var(--aethel-accent-light)] border border-[color-mix(in_srgb,var(--aethel-accent)_35%,transparent)]'
                      : 'border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'
                  }`}
                >
                  {categoryLabels[category] ?? category}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-[var(--aethel-text-secondary)]">Carregando extensoes...</div>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredExtensions.map((ext) => (
                <div
                  key={ext.id}
                  className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6 transition-colors hover:border-[var(--aethel-border-secondary)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] text-sm font-semibold text-[var(--aethel-text-primary)]">
                      {getExtensionBadge(ext)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">{ext.displayName}</h3>
                      <p className="text-xs text-[var(--aethel-text-tertiary)]">
                        por {ext.publisher} ? v{ext.version}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-2 text-sm text-[var(--aethel-text-secondary)]">{ext.description}</p>

                  <div className="mt-4 flex items-center gap-4 text-xs text-[var(--aethel-text-tertiary)]">
                    <span>Avaliacao {ext.rating.toFixed(1)}</span>
                    <span>Downloads {(ext.downloads / 1000).toFixed(0)}K</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {ext.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] px-2.5 py-1 text-[10px] text-[var(--aethel-text-secondary)]">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex gap-2">
                    {ext.installed ? (
                      <>
                        <button
                          onClick={() => handleUninstall(ext.id)}
                          className="aethel-button aethel-button-danger w-full rounded-xl px-3 py-2 text-xs font-semibold"
                        >
                          Desinstalar
                        </button>
                        <button className="aethel-button aethel-button-secondary rounded-xl px-3 py-2 text-xs font-semibold">
                          Configurar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleInstall(ext.id)}
                        className="aethel-button aethel-button-primary w-full rounded-xl px-3 py-2 text-xs font-semibold"
                      >
                        Instalar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredExtensions.length == 0 && (
            <div className="py-12 text-center">
              <p className="text-lg text-[var(--aethel-text-secondary)]">Nenhuma extensao encontrada</p>
              <p className="mt-2 text-sm text-[var(--aethel-text-tertiary)]">Ajuste sua busca ou filtros</p>
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
