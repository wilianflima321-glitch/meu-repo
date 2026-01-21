'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Extension {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  publisher: string;
  icon?: string;
  downloads: number;
  rating: number;
  categories: string[];
  tags: string[];
  repository?: string;
  license?: string;
  installed: boolean;
}

export default function MarketplacePage() {
  const { t } = useTranslation();
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'downloads' | 'rating' | 'name'>('downloads');

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
    'productivity'
  ];

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
  };

  useEffect(() => {
    loadExtensions();
  }, []);

  const loadExtensions = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/marketplace/extensions');
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          (data && typeof data === 'object' && 'message' in data && typeof (data as any).message === 'string')
            ? (data as any).message
            : 'Não foi possível carregar o marketplace de extensões.';
        setExtensions([]);
        setLoadError(message);
        return;
      }

      const next = (data && typeof data === 'object' && Array.isArray((data as any).extensions))
        ? ((data as any).extensions as Extension[])
        : [];
      setExtensions(next);
    } catch (error) {
      console.error('Failed to load extensions:', error);
      setExtensions([]);
      setLoadError('Falha de rede ao carregar extensões.');
    } finally {
      setLoading(false);
    }
  };

  const getExtensionBadge = (ext: Extension): string => {
    const base = (ext.displayName || ext.name || '').trim();
    if (!base) return 'EXT';
    const parts = base.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('');
    return initials || base.slice(0, 3).toUpperCase();
  };

  const handleInstall = async (extensionId: string) => {
    try {
      const response = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionId })
      });

      if (response.ok) {
        setExtensions(prev =>
          prev.map(ext =>
            ext.id === extensionId ? { ...ext, installed: true } : ext
          )
        );
      }
    } catch (error) {
      console.error('Failed to install extension:', error);
    }
  };

  const handleUninstall = async (extensionId: string) => {
    try {
      const response = await fetch('/api/marketplace/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionId })
      });

      if (response.ok) {
        setExtensions(prev =>
          prev.map(ext =>
            ext.id === extensionId ? { ...ext, installed: false } : ext
          )
        );
      }
    } catch (error) {
      console.error('Failed to uninstall extension:', error);
    }
  };

  const filteredExtensions = extensions
    .filter(ext => {
      const matchesSearch =
        ext.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ext.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ext.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || ext.categories.includes(selectedCategory);

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'downloads') return b.downloads - a.downloads;
      if (sortBy === 'rating') return b.rating - a.rating;
      return a.displayName.localeCompare(b.displayName);
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Marketplace de extensões</h1>
          <p className="text-slate-300">Descubra e instale extensões para aprimorar sua IDE</p>
        </div>

        {loadError && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 mb-6 border border-slate-700">
            <p className="text-slate-200">{loadError}</p>
          </div>
        )}

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Buscar extensões..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="downloads">Mais baixadas</option>
                <option value="rating">Melhor avaliadas</option>
                <option value="name">Nome (A-Z)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === category
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {categoryLabels[category] ?? category}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            <p className="text-slate-300 mt-4">Carregando extensões...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExtensions.map(ext => (
              <div
                key={ext.id}
                className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded bg-slate-700 flex items-center justify-center text-white font-semibold text-sm">
                    {getExtensionBadge(ext)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-1">
                      {ext.displayName}
                    </h3>
                    <p className="text-sm text-slate-400">
                      por {ext.publisher} • v{ext.version}
                    </p>
                  </div>
                </div>

                <p className="text-slate-300 mb-4 line-clamp-2">{ext.description}</p>

                <div className="flex items-center gap-4 mb-4 text-sm text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Avaliação</span>
                    <span>{ext.rating.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Downloads</span>
                    <span>{(ext.downloads / 1000).toFixed(0)}K</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {ext.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  {ext.installed ? (
                    <>
                      <button
                        onClick={() => handleUninstall(ext.id)}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        Desinstalar
                      </button>
                      <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                        Configurar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleInstall(ext.id)}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Instalar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredExtensions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">Nenhuma extensão encontrada</p>
            <p className="text-slate-500 mt-2">Ajuste sua busca ou filtros</p>
          </div>
        )}
      </div>
    </div>
  );
}