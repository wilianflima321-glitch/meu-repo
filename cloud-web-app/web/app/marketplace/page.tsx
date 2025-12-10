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
  icon: string;
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

  useEffect(() => {
    loadExtensions();
  }, []);

  const loadExtensions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/marketplace/extensions');
      const data = await response.json();
      setExtensions(data.extensions || getMockExtensions());
    } catch (error) {
      console.error('Failed to load extensions:', error);
      setExtensions(getMockExtensions());
    } finally {
      setLoading(false);
    }
  };

  const getMockExtensions = (): Extension[] => [
    {
      id: 'python-lsp',
      name: 'python-lsp',
      displayName: 'Python Language Server',
      description: 'Full Python language support with IntelliSense, debugging, and refactoring',
      version: '1.0.0',
      publisher: 'Aethel',
      icon: '🐍',
      downloads: 150000,
      rating: 4.8,
      categories: ['languages', 'debuggers'],
      tags: ['python', 'lsp', 'intellisense'],
      repository: 'https://github.com/aethel/python-lsp',
      license: 'MIT',
      installed: false
    },
    {
      id: 'typescript-lsp',
      name: 'typescript-lsp',
      displayName: 'TypeScript Language Server',
      description: 'TypeScript and JavaScript language support with advanced features',
      version: '2.1.0',
      publisher: 'Aethel',
      icon: '📘',
      downloads: 200000,
      rating: 4.9,
      categories: ['languages'],
      tags: ['typescript', 'javascript', 'lsp'],
      repository: 'https://github.com/aethel/typescript-lsp',
      license: 'MIT',
      installed: false
    },
    {
      id: 'go-lsp',
      name: 'go-lsp',
      displayName: 'Go Language Server',
      description: 'Go language support powered by gopls',
      version: '1.5.0',
      publisher: 'Aethel',
      icon: '🐹',
      downloads: 80000,
      rating: 4.7,
      categories: ['languages', 'debuggers'],
      tags: ['go', 'golang', 'lsp'],
      repository: 'https://github.com/aethel/go-lsp',
      license: 'MIT',
      installed: false
    },
    {
      id: 'rust-analyzer',
      name: 'rust-analyzer',
      displayName: 'Rust Analyzer',
      description: 'Rust language support with rust-analyzer',
      version: '0.3.0',
      publisher: 'Aethel',
      icon: '🦀',
      downloads: 60000,
      rating: 4.9,
      categories: ['languages', 'debuggers'],
      tags: ['rust', 'lsp', 'cargo'],
      repository: 'https://github.com/aethel/rust-analyzer',
      license: 'MIT',
      installed: false
    },
    {
      id: 'ai-code-assistant',
      name: 'ai-code-assistant',
      displayName: 'AI Code Assistant Pro',
      description: 'Advanced AI-powered code completion and generation',
      version: '3.0.0',
      publisher: 'Aethel',
      icon: '🤖',
      downloads: 300000,
      rating: 4.9,
      categories: ['ai-tools', 'productivity'],
      tags: ['ai', 'completion', 'generation'],
      repository: 'https://github.com/aethel/ai-code-assistant',
      license: 'MIT',
      installed: true
    },
    {
      id: 'theme-dracula',
      name: 'theme-dracula',
      displayName: 'Dracula Theme',
      description: 'Dark theme with vibrant colors',
      version: '2.0.0',
      publisher: 'Dracula',
      icon: '🧛',
      downloads: 500000,
      rating: 4.8,
      categories: ['themes'],
      tags: ['theme', 'dark', 'dracula'],
      repository: 'https://github.com/dracula/dracula-theme',
      license: 'MIT',
      installed: false
    },
    {
      id: 'prettier-formatter',
      name: 'prettier-formatter',
      displayName: 'Prettier Code Formatter',
      description: 'Code formatter using Prettier',
      version: '5.0.0',
      publisher: 'Prettier',
      icon: '💅',
      downloads: 800000,
      rating: 4.7,
      categories: ['formatters'],
      tags: ['formatter', 'prettier', 'style'],
      repository: 'https://github.com/prettier/prettier',
      license: 'MIT',
      installed: false
    },
    {
      id: 'eslint-linter',
      name: 'eslint-linter',
      displayName: 'ESLint',
      description: 'JavaScript and TypeScript linter',
      version: '8.0.0',
      publisher: 'ESLint',
      icon: '🔍',
      downloads: 900000,
      rating: 4.6,
      categories: ['linters'],
      tags: ['linter', 'eslint', 'javascript'],
      repository: 'https://github.com/eslint/eslint',
      license: 'MIT',
      installed: false
    }
  ];

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
          <h1 className="text-4xl font-bold text-white mb-2">Extension Marketplace</h1>
          <p className="text-slate-300">Discover and install extensions to enhance your IDE</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search extensions..."
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
                <option value="downloads">Most Downloaded</option>
                <option value="rating">Highest Rated</option>
                <option value="name">Name (A-Z)</option>
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
                {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            <p className="text-slate-300 mt-4">Loading extensions...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExtensions.map(ext => (
              <div
                key={ext.id}
                className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl">{ext.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-1">
                      {ext.displayName}
                    </h3>
                    <p className="text-sm text-slate-400">
                      by {ext.publisher} • v{ext.version}
                    </p>
                  </div>
                </div>

                <p className="text-slate-300 mb-4 line-clamp-2">{ext.description}</p>

                <div className="flex items-center gap-4 mb-4 text-sm text-slate-400">
                  <div className="flex items-center gap-1">
                    <span>⭐</span>
                    <span>{ext.rating.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>📥</span>
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
                        Uninstall
                      </button>
                      <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                        ⚙️
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleInstall(ext.id)}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Install
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredExtensions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No extensions found</p>
            <p className="text-slate-500 mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}