import { useEffect, useMemo, useRef, useState } from 'react';

import type { SettingDefinition, SettingsCategory } from './settings-types';

interface UseSettingsUiStateOptions {
  settings: Map<string, SettingDefinition>;
}

export function useSettingsUiState({ settings }: UseSettingsUiStateOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Text Editor', 'Workbench', 'Aethel Engine'])
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
    const tree = new Map<string, Set<string>>();

    Array.from(settings.values()).forEach(setting => {
      const root = setting.category[0];
      if (!tree.has(root)) {
        tree.set(root, new Set());
      }
      if (setting.category.length > 1) {
        tree.get(root)?.add(setting.category[1]);
      }
    });

    return Array.from(tree.entries()).map(([label, children]) => ({
      id: label,
      label,
      children: Array.from(children).map(child => ({ id: child, label: child })),
    }));
  }, [settings]);

  const filteredSettings = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return Array.from(settings.values());
    }

    return Array.from(settings.values()).filter(setting =>
      setting.key.toLowerCase().includes(query) ||
      setting.description.toLowerCase().includes(query) ||
      setting.category.some(category => category.toLowerCase().includes(query))
    );
  }, [searchQuery, settings]);

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

  return {
    categories,
    expandedCategories,
    filteredSettings,
    groupedSettings,
    searchInputRef,
    searchQuery,
    setSearchQuery,
    setShowJSON,
    showJSON,
    toggleCategory,
  };
}
