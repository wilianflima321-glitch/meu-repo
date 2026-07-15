'use client';

export {
  getListboxProps,
  getMenuItemProps,
  getMenuProps,
  getOptionProps,
  getTabListProps,
  getTabPanelProps,
  getTabProps,
  getTreeItemProps,
  getTreeProps,
} from './accessibility.aria';
export type { A11yContextValue, ArrowKeyDirection, FocusTrapOptions } from './accessibility.types';
export { FocusTrap, getFirstFocusable, getFocusableElements, getLastFocusable } from './accessibility-focus';
export { handleArrowNavigation, useTypeAheadSearch } from './accessibility-keyboard';
export { announce, clearAnnouncements } from './accessibility-announcements';
export { useA11yPreferences, useAriaDescribedBy, useFocusTrap, useRovingTabIndex } from './accessibility-hooks';
export { A11yProvider, useA11y } from './accessibility-provider';
export { LiveRegion, SkipLinks, VisuallyHidden } from './accessibility-components';

import {
  getListboxProps,
  getMenuItemProps,
  getMenuProps,
  getOptionProps,
  getTabListProps,
  getTabPanelProps,
  getTabProps,
  getTreeItemProps,
  getTreeProps,
} from './accessibility.aria';
import { LiveRegion, SkipLinks, VisuallyHidden } from './accessibility-components';
import { announce, clearAnnouncements } from './accessibility-announcements';
import { FocusTrap, getFirstFocusable, getFocusableElements, getLastFocusable } from './accessibility-focus';
import { handleArrowNavigation, useTypeAheadSearch } from './accessibility-keyboard';
import { A11yProvider, useA11y } from './accessibility-provider';
import { useA11yPreferences, useAriaDescribedBy, useFocusTrap, useRovingTabIndex } from './accessibility-hooks';

const a11yExports = {
  announce,
  clearAnnouncements,
  getFocusableElements,
  getFirstFocusable,
  getLastFocusable,
  handleArrowNavigation,
  FocusTrap,
  A11yProvider,
  useA11y,
  useA11yPreferences,
  useFocusTrap,
  useRovingTabIndex,
  useAriaDescribedBy,
  useTypeAheadSearch,
  SkipLinks,
  VisuallyHidden,
  LiveRegion,
  getListboxProps,
  getOptionProps,
  getMenuProps,
  getMenuItemProps,
  getTreeProps,
  getTreeItemProps,
  getTabListProps,
  getTabProps,
  getTabPanelProps,
};

export default a11yExports;
