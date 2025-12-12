import React, { useState } from 'react';
import { useIDEStore } from '@/store/ideStore';
import {
  Puzzle, Search, Star, Download, Check, ExternalLink, Settings,
  Filter, TrendingUp, Clock, ChevronDown, MoreHorizontal
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const ExtensionsPanel = () => {
  const { extensions, toggleExtension } = useIDEStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('installed');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'Languages', 'Themes', 'Formatters', 'Linters', 'AI', 'SCM', 'DevOps'];

  const filteredExtensions = extensions.filter(ext => {
    const matchesSearch = ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ext.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ext.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const installedExtensions = filteredExtensions.filter(ext => ext.enabled);
  const marketplaceExtensions = [
    { id: 'm-1', name: 'Material Icon Theme', description: 'Material Design Icons for files', author: 'PKief', downloads: 45000, rating: 4.9, category: 'Themes' },
    { id: 'm-2', name: 'Bracket Pair Colorizer', description: 'Colorize matching brackets', author: 'CoenraadS', downloads: 38000, rating: 4.7, category: 'Formatters' },
    { id: 'm-3', name: 'Auto Rename Tag', description: 'Rename paired HTML tags', author: 'Jun Han', downloads: 29000, rating: 4.6, category: 'Languages' },
    { id: 'm-4', name: 'Path Intellisense', description: 'Autocomplete filenames', author: 'Christian', downloads: 25000, rating: 4.8, category: 'Languages' },
    { id: 'm-5', name: 'Code Spell Checker', description: 'Spell checker for code', author: 'Street Side', downloads: 22000, rating: 4.5, category: 'Linters' },
    { id: 'm-6', name: 'REST Client', description: 'HTTP client in editor', author: 'Huachao', downloads: 19000, rating: 4.7, category: 'DevOps' },
  ];

  const renderExtensionCard = (ext, isMarketplace = false) => (
    <div
      key={ext.id}
      className="p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-2xl">
          {ext.icon || '🧩'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white truncate">{ext.name}</h3>
            <Badge variant="outline" className="text-[10px] h-4 px-1 border-zinc-700">
              {ext.version || 'v1.0'}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{ext.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-zinc-600">{ext.author}</span>
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Download className="w-3 h-3" />
              {(ext.downloads / 1000).toFixed(0)}K
            </span>
            <span className="flex items-center gap-1 text-xs text-yellow-500">
              <Star className="w-3 h-3 fill-current" />
              {ext.rating}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isMarketplace ? (
            <Button size="sm" className="h-7 text-xs">
              Install
            </Button>
          ) : (
            <Button
              size="sm"
              variant={ext.enabled ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => toggleExtension(ext.id)}
              data-testid={`toggle-ext-${ext.id}`}
            >
              {ext.enabled ? (
                <><Check className="w-3 h-3 mr-1" /> Enabled</>
              ) : (
                'Enable'
              )}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
              <DropdownMenuItem className="text-xs">Extension Settings</DropdownMenuItem>
              <DropdownMenuItem className="text-xs">Copy Extension ID</DropdownMenuItem>
              {!isMarketplace && (
                <DropdownMenuItem className="text-xs text-red-400">Uninstall</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Puzzle className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">Extensions</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Settings className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search extensions"
            className="pl-9 bg-zinc-800 border-zinc-700 text-white text-sm h-8"
            data-testid="ext-search"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-3 py-2 border-b border-zinc-800">
        <ScrollArea className="w-full" orientation="horizontal">
          <div className="flex items-center gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-colors",
                  selectedCategory === cat
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                )}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-2 mx-3 mt-2 bg-zinc-800 h-8">
          <TabsTrigger value="installed" className="text-xs h-7">
            Installed ({installedExtensions.length})
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="text-xs h-7">
            Marketplace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="flex-1 overflow-hidden mt-0 p-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {installedExtensions.length > 0 ? (
                installedExtensions.map(ext => renderExtensionCard(ext))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Puzzle className="w-10 h-10 text-zinc-700 mb-3" />
                  <p className="text-zinc-500 text-sm">No extensions installed</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setActiveTab('marketplace')}>
                    Browse Marketplace
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="marketplace" className="flex-1 overflow-hidden mt-0 p-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {/* Featured */}
              <div>
                <h3 className="text-xs font-medium text-zinc-400 uppercase mb-2 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" /> Popular
                </h3>
                <div className="space-y-2">
                  {marketplaceExtensions.slice(0, 3).map(ext => renderExtensionCard(ext, true))}
                </div>
              </div>

              {/* Recent */}
              <div>
                <h3 className="text-xs font-medium text-zinc-400 uppercase mb-2 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Recently Added
                </h3>
                <div className="space-y-2">
                  {marketplaceExtensions.slice(3).map(ext => renderExtensionCard(ext, true))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExtensionsPanel;
