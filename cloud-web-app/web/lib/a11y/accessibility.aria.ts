// Pure ARIA prop helpers shared by Aethel UI primitives.

// ============================================================================
// ARIA Helpers
// ============================================================================

/**
 * Generate ARIA props for a listbox
 */
export function getListboxProps(
  selectedIndex: number,
  options: { multiselectable?: boolean; label?: string; labelledBy?: string }
) {
  return {
    role: 'listbox' as const,
    'aria-activedescendant': `option-${selectedIndex}`,
    'aria-multiselectable': options.multiselectable,
    'aria-label': options.label,
    'aria-labelledby': options.labelledBy,
    tabIndex: 0,
  };
}

/**
 * Generate ARIA props for a listbox option
 */
export function getOptionProps(
  index: number,
  isSelected: boolean,
  isDisabled?: boolean
) {
  return {
    id: `option-${index}`,
    role: 'option' as const,
    'aria-selected': isSelected,
    'aria-disabled': isDisabled,
    tabIndex: -1,
  };
}

/**
 * Generate ARIA props for a menu
 */
export function getMenuProps(options: { label?: string; labelledBy?: string }) {
  return {
    role: 'menu' as const,
    'aria-label': options.label,
    'aria-labelledby': options.labelledBy,
    tabIndex: -1,
  };
}

/**
 * Generate ARIA props for a menu item
 */
export function getMenuItemProps(isDisabled?: boolean) {
  return {
    role: 'menuitem' as const,
    'aria-disabled': isDisabled,
    tabIndex: -1,
  };
}

/**
 * Generate ARIA props for a tree
 */
export function getTreeProps(options: { label?: string; labelledBy?: string; multiselectable?: boolean }) {
  return {
    role: 'tree' as const,
    'aria-label': options.label,
    'aria-labelledby': options.labelledBy,
    'aria-multiselectable': options.multiselectable,
  };
}

/**
 * Generate ARIA props for a tree item
 */
export function getTreeItemProps(
  level: number,
  expanded?: boolean,
  hasChildren?: boolean,
  isSelected?: boolean
) {
  return {
    role: 'treeitem' as const,
    'aria-level': level,
    'aria-expanded': hasChildren ? expanded : undefined,
    'aria-selected': isSelected,
    tabIndex: -1,
  };
}

/**
 * Generate ARIA props for a tab list
 */
export function getTabListProps(options: { label?: string; labelledBy?: string; orientation?: 'horizontal' | 'vertical' }) {
  return {
    role: 'tablist' as const,
    'aria-label': options.label,
    'aria-labelledby': options.labelledBy,
    'aria-orientation': options.orientation || 'horizontal',
  };
}

/**
 * Generate ARIA props for a tab
 */
export function getTabProps(
  index: number,
  panelId: string,
  isSelected: boolean,
  isDisabled?: boolean
) {
  return {
    id: `tab-${index}`,
    role: 'tab' as const,
    'aria-selected': isSelected,
    'aria-controls': panelId,
    'aria-disabled': isDisabled,
    tabIndex: isSelected ? 0 : -1,
  };
}

/**
 * Generate ARIA props for a tab panel
 */
export function getTabPanelProps(index: number, tabId: string, isSelected: boolean) {
  return {
    id: `tabpanel-${index}`,
    role: 'tabpanel' as const,
    'aria-labelledby': tabId,
    tabIndex: 0,
    hidden: !isSelected,
  };
}
