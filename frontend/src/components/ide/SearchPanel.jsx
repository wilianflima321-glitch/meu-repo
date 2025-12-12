import React, { useState, useEffect } from 'react';
import { useIDEStore } from '@/store/ideStore';
import { searchFiles } from '@/services/api';
import {
  Search, Filter, Replace, ChevronDown, ChevronRight, FileCode,
  X, MoreHorizontal, RefreshCw, ALargeSmall, WholeWord, Regex
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { debounce } from 'lodash';

const SearchPanel = () => {
  const { currentProject, searchQuery, setSearchQuery, searchResults, setSearchResults, openFile } = useIDEStore();
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({
    caseSensitive: false,
    wholeWord: false,
    regex: false
  });
  const [expandedFiles, setExpandedFiles] = useState(new Set());
  const [includePattern, setIncludePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('node_modules');

  const handleSearch = async (query) => {
    if (!query.trim() || !currentProject?.id) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await searchFiles(currentProject.id, {
        query,
        include_content: true,
        file_types: includePattern ? includePattern.split(',').map(s => s.trim()) : null
      });
      setSearchResults(response.data.results || []);
      // Auto-expand all files with results
      setExpandedFiles(new Set(response.data.results?.map(r => r.file?.id) || []));
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = debounce(handleSearch, 300);

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, currentProject?.id]);

  const toggleFileExpanded = (fileId) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const totalMatches = searchResults.reduce((acc, r) => acc + (r.matches?.length || 0), 0);

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Search</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowReplace(!showReplace)}
          title="Toggle Replace"
        >
          <Replace className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Search Input */}
      <div className="p-3 space-y-2 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="pl-9 pr-20 bg-zinc-800 border-zinc-700 text-white text-sm h-8"
            data-testid="search-input"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <button
              onClick={() => setOptions(p => ({ ...p, caseSensitive: !p.caseSensitive }))}
              className={cn(
                "p-1 rounded hover:bg-zinc-700 transition-colors",
                options.caseSensitive && "bg-blue-500/20 text-blue-400"
              )}
              title="Match Case"
            >
              <ALargeSmall className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setOptions(p => ({ ...p, wholeWord: !p.wholeWord }))}
              className={cn(
                "p-1 rounded hover:bg-zinc-700 transition-colors",
                options.wholeWord && "bg-blue-500/20 text-blue-400"
              )}
              title="Match Whole Word"
            >
              <WholeWord className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setOptions(p => ({ ...p, regex: !p.regex }))}
              className={cn(
                "p-1 rounded hover:bg-zinc-700 transition-colors",
                options.regex && "bg-blue-500/20 text-blue-400"
              )}
              title="Use Regular Expression"
            >
              <Regex className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showReplace && (
          <div className="relative">
            <Replace className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Replace"
              className="pl-9 bg-zinc-800 border-zinc-700 text-white text-sm h-8"
              data-testid="replace-input"
            />
          </div>
        )}

        {/* Filters */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <Filter className="w-3 h-3" />
            <span>files to include/exclude</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            <Input
              value={includePattern}
              onChange={(e) => setIncludePattern(e.target.value)}
              placeholder="e.g., *.js, *.ts"
              className="bg-zinc-800 border-zinc-700 text-white text-xs h-7"
            />
            <Input
              value={excludePattern}
              onChange={(e) => setExcludePattern(e.target.value)}
              placeholder="e.g., node_modules, dist"
              className="bg-zinc-800 border-zinc-700 text-white text-xs h-7"
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Results Header */}
      {searchQuery && (
        <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {loading ? 'Searching...' : `${totalMatches} results in ${searchResults.length} files`}
          </span>
          <div className="flex items-center gap-1">
            {showReplace && searchResults.length > 0 && (
              <>
                <Button variant="ghost" size="sm" className="h-6 text-xs">Replace All</Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {searchResults.length > 0 ? (
            searchResults.map((result, i) => (
              <div key={i} className="mb-1">
                <button
                  className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-zinc-800 rounded text-left"
                  onClick={() => toggleFileExpanded(result.file?.id)}
                >
                  {expandedFiles.has(result.file?.id) ?
                    <ChevronDown className="w-3 h-3 text-zinc-500" /> :
                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                  }
                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-sm text-white flex-1 truncate">{result.file?.name}</span>
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                    {result.matches?.length || 0}
                  </span>
                </button>

                {expandedFiles.has(result.file?.id) && (
                  <div className="ml-6 border-l border-zinc-800">
                    {result.matches?.map((match, j) => (
                      <button
                        key={j}
                        className="flex items-start gap-2 w-full px-3 py-1.5 hover:bg-zinc-800 text-left"
                        onClick={() => openFile(result.file)}
                      >
                        {match.line && (
                          <span className="text-xs text-zinc-600 w-8 text-right flex-shrink-0">
                            {match.line}
                          </span>
                        )}
                        <span className="text-xs text-zinc-400 truncate">
                          {match.text ? highlightMatch(match.text, searchQuery) : match.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : searchQuery && !loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="w-10 h-10 text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm">No results found</p>
              <p className="text-zinc-600 text-xs mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="w-10 h-10 text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm">Search across all files</p>
              <p className="text-zinc-600 text-xs mt-1">Type to start searching</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const highlightMatch = (text, query) => {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="bg-yellow-500/30 text-yellow-200">{part}</span>
    ) : (
      part
    )
  );
};

export default SearchPanel;
