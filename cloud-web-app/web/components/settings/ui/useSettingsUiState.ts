import { useEffect, useMemo, useRef, useState } from 'react';

import type { SettingDefinition, SettingsCategory } from './settings-types';

interface UseSettingsUiStateOptions {
  settings: Map<string, SettingDefinition>;
  initialCategoryFilter?: string;
}

export function useSettingsUiState({ settings, initialCategoryFilter }: UseSettingsUiStateOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(initialCategoryFilter ?? null);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Text Editor', 'Workbench', 'Aethel Engine', ...(initialCategoryFilter ? [initialCategoryFilter] : [])])
  );
  const [showJSON, setShowJSON] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = useMemo<SettingsCategory[]>(() => {
    const tree = new Map<string, Map<string, number>>();
    const counts = new Map<string, number>();

    Array.from(settings.values()).forEach(setting => {
      const root = setting.category[0];
      counts.set(root, (counts.get(root) || 0) + 1);
      if (!tree.has(root)) {
        tree.set(root, new Map());
      }
      if (setting.category.length > 1) {
        const child = setting.category[1];
        const categoryChildren = tree.get(root);
        if (categoryChildren) {
          categoryChildren.set(child, (categoryChildren.get(child) || 0) + 1);
        }
      }
    });

    return Array.from(tree.entries()).map(([label, children]) => ({
      id: label,
      label,
      count: counts.get(label) || 0,
      children: Array.from(children.entries()).map(([child, count]) => ({
        id: child,
        label: child,
        count,
      })),
    }));
  }, [settings]);

  const filteredSettings = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return Array.from(settings.values()).filter(setting => {
      const matchesCategory =
        !activeCategoryId || setting.category[0] === activeCategoryId;
      const matchesChild =
        !activeChildId || setting.category[1] === activeChildId;
      const matchesQuery =
        !query ||
        setting.key.toLowerCase().includes(query) ||
        setting.description.toLowerCase().includes(query) ||
        setting.category.some(category => category.toLowerCase().includes(query));

      return matchesCategory && matchesChild && matchesQuery;
    });
  }, [activeCategoryId, activeChildId, searchQuery, settings]);

  const groupedSettings = useMemo(() => {
    const groups = new Map<string, SettingDefinition[]>();
    filteredSettings.forEach(setting => {
      const category = setting.category.join(' > ');
      const existing = groups.get(category) || [];
      existing.push(setting);
      groups.set(category, existing);
    });
    return groups;
  }, [filteredSettings]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(previous => {
      const next = new Set(previous);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const selectCategory = (category: string | null) => {
    setActiveCategoryId(category);
    setActiveChildId(null);

    if (category) {
      setExpandedCategories(previous => {
        const next = new Set(previous);
        next.add(category);
        return next;
      });
    }
  };

  const selectChild = (category: string, child: string) => {
    setActiveCategoryId(category);
    setActiveChildId(child);
    setExpandedCategories(previous => {
      const next = new Set(previous);
      next.add(category);
      return next;
    });
  };

  const clearFilters = () => {
    setActiveCategoryId(null);
    setActiveChildId(null);
    setSearchQuery('');
  };

  const activeFilterLabel = activeChildId
    ? `${activeCategoryId} / ${activeChildId}`
    : activeCategoryId;

  return {
    activeCategoryId,
    activeChildId,
    activeFilterLabel,
    categories,
    clearFilters,
    expandedCategories,
    filteredSettings,
    groupedSettings,
    searchInputRef,
    selectCategory,
    selectChild,
    searchQuery,
    setSearchQuery,
    setShowJSON,
    showJSON,
    toggleCategory,
  };
}
