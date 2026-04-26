import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  SettingItem,
  SettingsCategory,
  SettingsGroup,
  SettingsSubcategory,
} from './SettingsPageSections'

interface UseSettingsPageStateOptions {
  categories: SettingsCategory[]
  items: SettingItem[]
}

const GENERAL_GROUP_LABEL = 'General'

function normalizeQuery(searchQuery: string) {
  return searchQuery.trim().toLowerCase()
}

function findSubcategory(
  category: SettingsCategory | undefined,
  subcategoryId: string | undefined | null
) {
  if (!category || !subcategoryId) {
    return null
  }

  return category.subcategories?.find((subcategory) => subcategory.id === subcategoryId) ?? null
}

function matchesSettingQuery(
  setting: SettingItem,
  query: string,
  category: SettingsCategory | undefined,
  subcategory: SettingsSubcategory | null
) {
  if (!query) {
    return true
  }

  const searchableValues = [
    setting.label,
    setting.description,
    setting.id,
    setting.category,
    setting.subcategory,
    category?.label,
    category?.description,
    subcategory?.label,
    ...(setting.tags ?? []),
  ]

  return searchableValues.some((value) => value?.toLowerCase().includes(query))
}

export function useSettingsPageState({
  categories,
  items,
}: UseSettingsPageStateOptions) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categories[0]?.id ?? null
  )
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const normalizedQuery = useMemo(() => normalizeQuery(searchQuery), [searchQuery])

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  )

  const categoriesWithCounts = useMemo<SettingsCategory[]>(() => {
    return categories.map((category) => {
      const categoryItems = items.filter((setting) => setting.category === category.id)
      const visibleCategoryItems = categoryItems.filter((setting) =>
        matchesSettingQuery(
          setting,
          normalizedQuery,
          category,
          findSubcategory(category, setting.subcategory)
        )
      )

      return {
        ...category,
        count: categoryItems.length,
        visibleCount: visibleCategoryItems.length,
        subcategories: category.subcategories?.map((subcategory) => {
          const subcategoryItems = categoryItems.filter(
            (setting) => setting.subcategory === subcategory.id
          )
          const visibleSubcategoryItems = subcategoryItems.filter((setting) =>
            matchesSettingQuery(setting, normalizedQuery, category, subcategory)
          )

          return {
            ...subcategory,
            count: subcategoryItems.length,
            visibleCount: visibleSubcategoryItems.length,
          }
        }),
      }
    })
  }, [categories, items, normalizedQuery])

  const filteredSettings = useMemo(() => {
    return items.filter((setting) => {
      const category = categoryMap.get(setting.category)
      const subcategory = findSubcategory(category, setting.subcategory)
      const matchesCategory = !selectedCategory || setting.category === selectedCategory
      const matchesSubcategory = !selectedSubcategory || setting.subcategory === selectedSubcategory
      const matchesQuery = matchesSettingQuery(setting, normalizedQuery, category, subcategory)

      return matchesCategory && matchesSubcategory && matchesQuery
    })
  }, [categoryMap, items, normalizedQuery, selectedCategory, selectedSubcategory])

  const currentCategory = useMemo(
    () => categoriesWithCounts.find((category) => category.id === selectedCategory),
    [categoriesWithCounts, selectedCategory]
  )

  const currentSubcategory = useMemo(
    () => findSubcategory(currentCategory, selectedSubcategory),
    [currentCategory, selectedSubcategory]
  )

  const groupedSettings = useMemo<SettingsGroup[]>(() => {
    const isScopedToSingleCategory = Boolean(selectedCategory) && !normalizedQuery
    const groups = new Map<string, SettingsGroup>()

    filteredSettings.forEach((setting) => {
      const category = categoryMap.get(setting.category)
      const categoryLabel = category?.label ?? setting.category
      const subcategory = findSubcategory(category, setting.subcategory)
      const groupId = `${setting.category}:${setting.subcategory ?? 'general'}`
      const groupTitle = isScopedToSingleCategory
        ? subcategory?.label ?? GENERAL_GROUP_LABEL
        : subcategory
          ? `${categoryLabel} / ${subcategory.label}`
          : categoryLabel
      const groupDescription = subcategory
        ? `${categoryLabel} settings`
        : category?.description ?? `${categoryLabel} settings`

      const existingGroup = groups.get(groupId)
      if (existingGroup) {
        existingGroup.settings.push(setting)
        return
      }

      groups.set(groupId, {
        id: groupId,
        title: groupTitle,
        description: groupDescription,
        settings: [setting],
      })
    })

    return Array.from(groups.values())
  }, [categoryMap, filteredSettings, normalizedQuery, selectedCategory])

  const activeFilterLabel = currentSubcategory
    ? `${currentCategory?.label ?? selectedCategory} / ${currentSubcategory.label}`
    : currentCategory?.label ?? null

  const clearFilters = useCallback(() => {
    setSelectedCategory(null)
    setSelectedSubcategory(null)
    setSearchQuery('')
  }, [])

  const selectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId)
    setSelectedSubcategory(null)
  }, [])

  const selectSubcategory = useCallback((categoryId: string, subcategoryId: string) => {
    setSelectedCategory(categoryId)
    setSelectedSubcategory(subcategoryId)
  }, [])

  return {
    activeFilterLabel,
    categories: categoriesWithCounts,
    clearFilters,
    currentCategory,
    filteredSettings,
    groupedSettings,
    searchInputRef,
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    selectCategory,
    selectSubcategory,
    setSearchQuery,
    totalCount: items.length,
  }
}
