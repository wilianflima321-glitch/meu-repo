/**
 * Aethel IDE - Theme Context & Provider
 * 
 * Gerenciamento completo de temas com suporte a:
 * - Temas built-in (Dark+, Light+, Monokai, etc.)
 * - Temas customizados
 * - Sincronização com Monaco Editor
 * - Persistência de preferências
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ThemeColors {
  // Editor
  'editor.background': string;
  'editor.foreground': string;
  'editor.lineHighlightBackground': string;
  'editor.selectionBackground': string;
  'editor.inactiveSelectionBackground': string;
  'editor.findMatchBackground': string;
  'editor.findMatchHighlightBackground': string;
  'editorCursor.foreground': string;
  'editorWhitespace.foreground': string;
  'editorLineNumber.foreground': string;
  'editorLineNumber.activeForeground': string;
  'editorIndentGuide.background': string;
  'editorIndentGuide.activeBackground': string;
  'editorBracketMatch.background': string;
  'editorBracketMatch.border': string;
  
  // Sidebar
  'sideBar.background': string;
  'sideBar.foreground': string;
  'sideBar.border': string;
  'sideBarTitle.foreground': string;
  'sideBarSectionHeader.background': string;
  'sideBarSectionHeader.foreground': string;
  
  // Activity Bar
  'activityBar.background': string;
  'activityBar.foreground': string;
  'activityBar.inactiveForeground': string;
  'activityBar.border': string;
  'activityBarBadge.background': string;
  'activityBarBadge.foreground': string;
  
  // Status Bar
  'statusBar.background': string;
  'statusBar.foreground': string;
  'statusBar.border': string;
  'statusBar.debuggingBackground': string;
  'statusBar.debuggingForeground': string;
  'statusBar.noFolderBackground': string;
  
  // Tabs
  'tab.activeBackground': string;
  'tab.activeForeground': string;
  'tab.inactiveBackground': string;
  'tab.inactiveForeground': string;
  'tab.border': string;
  'tab.activeBorder': string;
  'tab.activeBorderTop': string;
  
  // Panel
  'panel.background': string;
  'panel.border': string;
  'panelTitle.activeBorder': string;
  'panelTitle.activeForeground': string;
  'panelTitle.inactiveForeground': string;
  
  // Terminal
  'terminal.background': string;
  'terminal.foreground': string;
  'terminal.ansiBlack': string;
  'terminal.ansiRed': string;
  'terminal.ansiGreen': string;
  'terminal.ansiYellow': string;
  'terminal.ansiBlue': string;
  'terminal.ansiMagenta': string;
  'terminal.ansiCyan': string;
  'terminal.ansiWhite': string;
  'terminal.ansiBrightBlack': string;
  'terminal.ansiBrightRed': string;
  'terminal.ansiBrightGreen': string;
  'terminal.ansiBrightYellow': string;
  'terminal.ansiBrightBlue': string;
  'terminal.ansiBrightMagenta': string;
  'terminal.ansiBrightCyan': string;
  'terminal.ansiBrightWhite': string;
  
  // Inputs
  'input.background': string;
  'input.foreground': string;
  'input.border': string;
  'input.placeholderForeground': string;
  'inputOption.activeBorder': string;
  'inputOption.activeBackground': string;
  
  // Buttons
  'button.background': string;
  'button.foreground': string;
  'button.hoverBackground': string;
  'button.secondaryBackground': string;
  'button.secondaryForeground': string;
  
  // Lists
  'list.activeSelectionBackground': string;
  'list.activeSelectionForeground': string;
  'list.hoverBackground': string;
  'list.hoverForeground': string;
  'list.inactiveSelectionBackground': string;
  'list.highlightForeground': string;
  
  // Focus
  'focusBorder': string;
  
  // Scrollbar
  'scrollbar.shadow': string;
  'scrollbarSlider.background': string;
  'scrollbarSlider.hoverBackground': string;
  'scrollbarSlider.activeBackground': string;
  
  // Badges
  'badge.background': string;
  'badge.foreground': string;
  
  // Progress
  'progressBar.background': string;
  
  // Notifications
  'notifications.background': string;
  'notifications.foreground': string;
  'notifications.border': string;
  
  // Custom
  [key: string]: string;
}

export interface TokenColor {
  name?: string;
  scope: string | string[];
  settings: {
    foreground?: string;
    background?: string;
    fontStyle?: string;
  };
}

export interface Theme {
  id: string;
  name: string;
  type: 'dark' | 'light' | 'hc-dark' | 'hc-light';
  colors: Partial<ThemeColors>;
  tokenColors: TokenColor[];
}

export interface ThemeContextValue {
  theme: Theme;
  themeType: 'dark' | 'light' | 'hc-dark' | 'hc-light';
  availableThemes: Theme[];
  setTheme: (themeId: string) => void;
  registerTheme: (theme: Theme) => void;
  getColor: (key: keyof ThemeColors) => string;
  isDark: boolean;
  isHighContrast: boolean;
}

// ============================================================================
// BUILT-IN THEMES
// ============================================================================

const darkPlusTheme: Theme = {
  id: 'dark-plus',
  name: 'Dark+ (default dark)',
  type: 'dark',
  colors: {
    'editor.background': '#1e1e1e',
    'editor.foreground': '#d4d4d4',
    'editor.lineHighlightBackground': '#2a2d2e',
    'editor.selectionBackground': '#264f78',
    'editor.inactiveSelectionBackground': '#3a3d41',
    'editor.findMatchBackground': '#515c6a',
    'editor.findMatchHighlightBackground': '#ea5c0055',
    'editorCursor.foreground': '#aeafad',
    'editorWhitespace.foreground': '#3b3b3b',
    'editorLineNumber.foreground': '#858585',
    'editorLineNumber.activeForeground': '#c6c6c6',
    'editorIndentGuide.background': '#404040',
    'editorIndentGuide.activeBackground': '#707070',
    'editorBracketMatch.background': '#0d3a58',
    'editorBracketMatch.border': '#888888',
    
    'sideBar.background': '#252526',
    'sideBar.foreground': '#cccccc',
    'sideBar.border': '#00000000',
    'sideBarTitle.foreground': '#bbbbbb',
    'sideBarSectionHeader.background': '#00000000',
    'sideBarSectionHeader.foreground': '#bbbbbb',
    
    'activityBar.background': '#333333',
    'activityBar.foreground': '#ffffff',
    'activityBar.inactiveForeground': '#ffffff66',
    'activityBar.border': '#00000000',
    'activityBarBadge.background': '#007acc',
    'activityBarBadge.foreground': '#ffffff',
    
    'statusBar.background': '#007acc',
    'statusBar.foreground': '#ffffff',
    'statusBar.border': '#00000000',
    'statusBar.debuggingBackground': '#cc6633',
    'statusBar.debuggingForeground': '#ffffff',
    'statusBar.noFolderBackground': '#68217a',
    
    'tab.activeBackground': '#1e1e1e',
    'tab.activeForeground': '#ffffff',
    'tab.inactiveBackground': '#2d2d2d',
    'tab.inactiveForeground': '#ffffff80',
    'tab.border': '#252526',
    'tab.activeBorder': '#00000000',
    'tab.activeBorderTop': '#007acc',
    
    'panel.background': '#1e1e1e',
    'panel.border': '#80808059',
    'panelTitle.activeBorder': '#007acc',
    'panelTitle.activeForeground': '#e7e7e7',
    'panelTitle.inactiveForeground': '#e7e7e799',
    
    'terminal.background': '#1e1e1e',
    'terminal.foreground': '#cccccc',
    'terminal.ansiBlack': '#000000',
    'terminal.ansiRed': '#cd3131',
    'terminal.ansiGreen': '#0dbc79',
    'terminal.ansiYellow': '#e5e510',
    'terminal.ansiBlue': '#2472c8',
    'terminal.ansiMagenta': '#bc3fbc',
    'terminal.ansiCyan': '#11a8cd',
    'terminal.ansiWhite': '#e5e5e5',
    'terminal.ansiBrightBlack': '#666666',
    'terminal.ansiBrightRed': '#f14c4c',
    'terminal.ansiBrightGreen': '#23d18b',
    'terminal.ansiBrightYellow': '#f5f543',
    'terminal.ansiBrightBlue': '#3b8eea',
    'terminal.ansiBrightMagenta': '#d670d6',
    'terminal.ansiBrightCyan': '#29b8db',
    'terminal.ansiBrightWhite': '#e5e5e5',
    
    'input.background': '#3c3c3c',
    'input.foreground': '#cccccc',
    'input.border': '#00000000',
    'input.placeholderForeground': '#a6a6a6',
    'inputOption.activeBorder': '#007acc',
    'inputOption.activeBackground': '#007acc40',
    
    'button.background': '#0e639c',
    'button.foreground': '#ffffff',
    'button.hoverBackground': '#1177bb',
    'button.secondaryBackground': '#3a3d41',
    'button.secondaryForeground': '#ffffff',
    
    'list.activeSelectionBackground': '#094771',
    'list.activeSelectionForeground': '#ffffff',
    'list.hoverBackground': '#2a2d2e',
    'list.hoverForeground': '#ffffff',
    'list.inactiveSelectionBackground': '#37373d',
    'list.highlightForeground': '#18a3ff',
    
    'focusBorder': '#007acc',
    
    'scrollbar.shadow': '#000000',
    'scrollbarSlider.background': '#79797966',
    'scrollbarSlider.hoverBackground': '#646464b3',
    'scrollbarSlider.activeBackground': '#bfbfbf66',
    
    'badge.background': '#4d4d4d',
    'badge.foreground': '#ffffff',
    
    'progressBar.background': '#0e70c0',
    
    'notifications.background': '#252526',
    'notifications.foreground': '#cccccc',
    'notifications.border': '#303031',
  },
  tokenColors: [
    { scope: 'comment', settings: { foreground: '#6A9955' } },
    { scope: 'string', settings: { foreground: '#CE9178' } },
    { scope: 'constant.numeric', settings: { foreground: '#B5CEA8' } },
    { scope: 'constant.language', settings: { foreground: '#569CD6' } },
    { scope: 'keyword', settings: { foreground: '#569CD6' } },
    { scope: 'keyword.control', settings: { foreground: '#C586C0' } },
    { scope: 'keyword.operator', settings: { foreground: '#D4D4D4' } },
    { scope: 'storage.type', settings: { foreground: '#569CD6' } },
    { scope: 'storage.modifier', settings: { foreground: '#569CD6' } },
    { scope: 'entity.name.function', settings: { foreground: '#DCDCAA' } },
    { scope: 'entity.name.type', settings: { foreground: '#4EC9B0' } },
    { scope: 'entity.name.class', settings: { foreground: '#4EC9B0' } },
    { scope: 'variable', settings: { foreground: '#9CDCFE' } },
    { scope: 'variable.parameter', settings: { foreground: '#9CDCFE' } },
    { scope: 'support.function', settings: { foreground: '#DCDCAA' } },
    { scope: 'support.type', settings: { foreground: '#4EC9B0' } },
    { scope: 'punctuation', settings: { foreground: '#D4D4D4' } },
    { scope: 'meta.tag', settings: { foreground: '#808080' } },
    { scope: 'entity.name.tag', settings: { foreground: '#569CD6' } },
    { scope: 'entity.other.attribute-name', settings: { foreground: '#9CDCFE' } },
  ],
};

const lightPlusTheme: Theme = {
  id: 'light-plus',
  name: 'Light+ (default light)',
  type: 'light',
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#000000',
    'editor.lineHighlightBackground': '#f3f3f3',
    'editor.selectionBackground': '#add6ff',
    'editor.inactiveSelectionBackground': '#e5ebf1',
    'editor.findMatchBackground': '#a8ac94',
    'editor.findMatchHighlightBackground': '#ea5c0055',
    'editorCursor.foreground': '#000000',
    'editorWhitespace.foreground': '#33333333',
    'editorLineNumber.foreground': '#237893',
    'editorLineNumber.activeForeground': '#0b216f',
    'editorIndentGuide.background': '#d3d3d3',
    'editorIndentGuide.activeBackground': '#939393',
    'editorBracketMatch.background': '#0064001a',
    'editorBracketMatch.border': '#b9b9b9',
    
    'sideBar.background': '#f3f3f3',
    'sideBar.foreground': '#616161',
    'sideBar.border': '#00000000',
    'sideBarTitle.foreground': '#6f6f6f',
    'sideBarSectionHeader.background': '#00000000',
    'sideBarSectionHeader.foreground': '#616161',
    
    'activityBar.background': '#2c2c2c',
    'activityBar.foreground': '#ffffff',
    'activityBar.inactiveForeground': '#ffffff66',
    'activityBar.border': '#00000000',
    'activityBarBadge.background': '#007acc',
    'activityBarBadge.foreground': '#ffffff',
    
    'statusBar.background': '#007acc',
    'statusBar.foreground': '#ffffff',
    'statusBar.border': '#00000000',
    'statusBar.debuggingBackground': '#cc6633',
    'statusBar.debuggingForeground': '#ffffff',
    'statusBar.noFolderBackground': '#68217a',
    
    'tab.activeBackground': '#ffffff',
    'tab.activeForeground': '#333333',
    'tab.inactiveBackground': '#ececec',
    'tab.inactiveForeground': '#333333b3',
    'tab.border': '#f3f3f3',
    'tab.activeBorder': '#00000000',
    'tab.activeBorderTop': '#007acc',
    
    'panel.background': '#ffffff',
    'panel.border': '#80808059',
    'panelTitle.activeBorder': '#007acc',
    'panelTitle.activeForeground': '#424242',
    'panelTitle.inactiveForeground': '#424242b3',
    
    'terminal.background': '#ffffff',
    'terminal.foreground': '#333333',
    'terminal.ansiBlack': '#000000',
    'terminal.ansiRed': '#cd3131',
    'terminal.ansiGreen': '#00bc00',
    'terminal.ansiYellow': '#949800',
    'terminal.ansiBlue': '#0451a5',
    'terminal.ansiMagenta': '#bc05bc',
    'terminal.ansiCyan': '#0598bc',
    'terminal.ansiWhite': '#555555',
    'terminal.ansiBrightBlack': '#666666',
    'terminal.ansiBrightRed': '#cd3131',
    'terminal.ansiBrightGreen': '#14ce14',
    'terminal.ansiBrightYellow': '#b5ba00',
    'terminal.ansiBrightBlue': '#0451a5',
    'terminal.ansiBrightMagenta': '#bc05bc',
    'terminal.ansiBrightCyan': '#0598bc',
    'terminal.ansiBrightWhite': '#a5a5a5',
    
    'input.background': '#ffffff',
    'input.foreground': '#616161',
    'input.border': '#cecece',
    'input.placeholderForeground': '#767676',
    'inputOption.activeBorder': '#007acc',
    'inputOption.activeBackground': '#007acc40',
    
    'button.background': '#007acc',
    'button.foreground': '#ffffff',
    'button.hoverBackground': '#0062a3',
    'button.secondaryBackground': '#5f6a79',
    'button.secondaryForeground': '#ffffff',
    
    'list.activeSelectionBackground': '#0060c0',
    'list.activeSelectionForeground': '#ffffff',
    'list.hoverBackground': '#e8e8e8',
    'list.hoverForeground': '#000000',
    'list.inactiveSelectionBackground': '#e4e6f1',
    'list.highlightForeground': '#0066bf',
    
    'focusBorder': '#007acc',
    
    'scrollbar.shadow': '#dddddd',
    'scrollbarSlider.background': '#64646466',
    'scrollbarSlider.hoverBackground': '#646464b3',
    'scrollbarSlider.activeBackground': '#00000099',
    
    'badge.background': '#c4c4c4',
    'badge.foreground': '#333333',
    
    'progressBar.background': '#0e70c0',
    
    'notifications.background': '#f3f3f3',
    'notifications.foreground': '#616161',
    'notifications.border': '#e7e7e7',
  },
  tokenColors: [
    { scope: 'comment', settings: { foreground: '#008000' } },
    { scope: 'string', settings: { foreground: '#a31515' } },
    { scope: 'constant.numeric', settings: { foreground: '#098658' } },
    { scope: 'constant.language', settings: { foreground: '#0000ff' } },
    { scope: 'keyword', settings: { foreground: '#0000ff' } },
    { scope: 'keyword.control', settings: { foreground: '#af00db' } },
    { scope: 'keyword.operator', settings: { foreground: '#000000' } },
    { scope: 'storage.type', settings: { foreground: '#0000ff' } },
    { scope: 'storage.modifier', settings: { foreground: '#0000ff' } },
    { scope: 'entity.name.function', settings: { foreground: '#795e26' } },
    { scope: 'entity.name.type', settings: { foreground: '#267f99' } },
    { scope: 'entity.name.class', settings: { foreground: '#267f99' } },
    { scope: 'variable', settings: { foreground: '#001080' } },
    { scope: 'variable.parameter', settings: { foreground: '#001080' } },
    { scope: 'support.function', settings: { foreground: '#795e26' } },
    { scope: 'support.type', settings: { foreground: '#267f99' } },
    { scope: 'punctuation', settings: { foreground: '#000000' } },
    { scope: 'meta.tag', settings: { foreground: '#800000' } },
    { scope: 'entity.name.tag', settings: { foreground: '#800000' } },
    { scope: 'entity.other.attribute-name', settings: { foreground: '#ff0000' } },
  ],
};

const monokaiTheme: Theme = {
  id: 'monokai',
  name: 'Monokai',
  type: 'dark',
  colors: {
    'editor.background': '#272822',
    'editor.foreground': '#f8f8f2',
    'editor.lineHighlightBackground': '#3e3d32',
    'editor.selectionBackground': '#49483e',
    'editor.inactiveSelectionBackground': '#49483e',
    'editor.findMatchBackground': '#75715e80',
    'editor.findMatchHighlightBackground': '#75715e40',
    'editorCursor.foreground': '#f8f8f0',
    'editorWhitespace.foreground': '#464741',
    'editorLineNumber.foreground': '#90908a',
    'editorLineNumber.activeForeground': '#c2c2bf',
    'editorIndentGuide.background': '#464741',
    'editorIndentGuide.activeBackground': '#767771',
    'editorBracketMatch.background': '#3e3d32',
    'editorBracketMatch.border': '#888888',
    
    'sideBar.background': '#21201e',
    'sideBar.foreground': '#cccccc',
    'sideBar.border': '#00000000',
    'sideBarTitle.foreground': '#bbbbbb',
    'sideBarSectionHeader.background': '#00000000',
    'sideBarSectionHeader.foreground': '#bbbbbb',
    
    'activityBar.background': '#272822',
    'activityBar.foreground': '#f8f8f2',
    'activityBar.inactiveForeground': '#f8f8f266',
    'activityBar.border': '#00000000',
    'activityBarBadge.background': '#75715e',
    'activityBarBadge.foreground': '#f8f8f2',
    
    'statusBar.background': '#414339',
    'statusBar.foreground': '#f8f8f2',
    'statusBar.border': '#00000000',
    'statusBar.debuggingBackground': '#75715e',
    'statusBar.debuggingForeground': '#f8f8f2',
    'statusBar.noFolderBackground': '#414339',
    
    'tab.activeBackground': '#272822',
    'tab.activeForeground': '#f8f8f2',
    'tab.inactiveBackground': '#34352f',
    'tab.inactiveForeground': '#f8f8f280',
    'tab.border': '#1e1f1c',
    'tab.activeBorder': '#00000000',
    'tab.activeBorderTop': '#f8f8f2',
    
    'panel.background': '#272822',
    'panel.border': '#414339',
    'panelTitle.activeBorder': '#f8f8f2',
    'panelTitle.activeForeground': '#f8f8f2',
    'panelTitle.inactiveForeground': '#f8f8f299',
    
    'terminal.background': '#272822',
    'terminal.foreground': '#f8f8f2',
    'terminal.ansiBlack': '#272822',
    'terminal.ansiRed': '#f92672',
    'terminal.ansiGreen': '#a6e22e',
    'terminal.ansiYellow': '#f4bf75',
    'terminal.ansiBlue': '#66d9ef',
    'terminal.ansiMagenta': '#ae81ff',
    'terminal.ansiCyan': '#a1efe4',
    'terminal.ansiWhite': '#f8f8f2',
    'terminal.ansiBrightBlack': '#75715e',
    'terminal.ansiBrightRed': '#f92672',
    'terminal.ansiBrightGreen': '#a6e22e',
    'terminal.ansiBrightYellow': '#f4bf75',
    'terminal.ansiBrightBlue': '#66d9ef',
    'terminal.ansiBrightMagenta': '#ae81ff',
    'terminal.ansiBrightCyan': '#a1efe4',
    'terminal.ansiBrightWhite': '#f9f8f5',
    
    'input.background': '#414339',
    'input.foreground': '#f8f8f2',
    'input.border': '#00000000',
    'input.placeholderForeground': '#a6a6a6',
    'inputOption.activeBorder': '#a6e22e',
    'inputOption.activeBackground': '#a6e22e40',
    
    'button.background': '#75715e',
    'button.foreground': '#f8f8f2',
    'button.hoverBackground': '#8f8b7d',
    'button.secondaryBackground': '#414339',
    'button.secondaryForeground': '#f8f8f2',
    
    'list.activeSelectionBackground': '#75715e',
    'list.activeSelectionForeground': '#f8f8f2',
    'list.hoverBackground': '#3e3d32',
    'list.hoverForeground': '#f8f8f2',
    'list.inactiveSelectionBackground': '#49483e',
    'list.highlightForeground': '#a6e22e',
    
    'focusBorder': '#75715e',
    
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#75715e66',
    'scrollbarSlider.hoverBackground': '#75715eb3',
    'scrollbarSlider.activeBackground': '#75715ecc',
    
    'badge.background': '#75715e',
    'badge.foreground': '#f8f8f2',
    
    'progressBar.background': '#a6e22e',
    
    'notifications.background': '#21201e',
    'notifications.foreground': '#f8f8f2',
    'notifications.border': '#414339',
  },
  tokenColors: [
    { scope: 'comment', settings: { foreground: '#75715E', fontStyle: 'italic' } },
    { scope: 'string', settings: { foreground: '#E6DB74' } },
    { scope: 'constant.numeric', settings: { foreground: '#AE81FF' } },
    { scope: 'constant.language', settings: { foreground: '#AE81FF' } },
    { scope: 'keyword', settings: { foreground: '#F92672' } },
    { scope: 'keyword.control', settings: { foreground: '#F92672' } },
    { scope: 'keyword.operator', settings: { foreground: '#F92672' } },
    { scope: 'storage.type', settings: { foreground: '#66D9EF', fontStyle: 'italic' } },
    { scope: 'storage.modifier', settings: { foreground: '#F92672' } },
    { scope: 'entity.name.function', settings: { foreground: '#A6E22E' } },
    { scope: 'entity.name.type', settings: { foreground: '#A6E22E', fontStyle: 'underline' } },
    { scope: 'entity.name.class', settings: { foreground: '#A6E22E', fontStyle: 'underline' } },
    { scope: 'variable', settings: { foreground: '#F8F8F2' } },
    { scope: 'variable.parameter', settings: { foreground: '#FD971F', fontStyle: 'italic' } },
    { scope: 'support.function', settings: { foreground: '#66D9EF' } },
    { scope: 'support.type', settings: { foreground: '#66D9EF', fontStyle: 'italic' } },
    { scope: 'punctuation', settings: { foreground: '#F8F8F2' } },
    { scope: 'meta.tag', settings: { foreground: '#F8F8F2' } },
    { scope: 'entity.name.tag', settings: { foreground: '#F92672' } },
    { scope: 'entity.other.attribute-name', settings: { foreground: '#A6E22E' } },
  ],
};

const highContrastDarkTheme: Theme = {
  id: 'hc-dark',
  name: 'High Contrast Dark',
  type: 'hc-dark',
  colors: {
    'editor.background': '#000000',
    'editor.foreground': '#ffffff',
    'editor.lineHighlightBackground': '#00000000',
    'editor.selectionBackground': '#264f78',
    'editor.inactiveSelectionBackground': '#264f7899',
    'editor.findMatchBackground': '#515c6a',
    'editor.findMatchHighlightBackground': '#ea5c0055',
    'editorCursor.foreground': '#ffffff',
    'editorWhitespace.foreground': '#e3e4e229',
    'editorLineNumber.foreground': '#ffffff',
    'editorLineNumber.activeForeground': '#ffffff',
    'editorIndentGuide.background': '#ffffff1a',
    'editorIndentGuide.activeBackground': '#ffffff4d',
    'editorBracketMatch.background': '#0d3a58',
    'editorBracketMatch.border': '#ffffff',
    
    'sideBar.background': '#000000',
    'sideBar.foreground': '#ffffff',
    'sideBar.border': '#6fc3df',
    'sideBarTitle.foreground': '#ffffff',
    'sideBarSectionHeader.background': '#000000',
    'sideBarSectionHeader.foreground': '#ffffff',
    
    'activityBar.background': '#000000',
    'activityBar.foreground': '#ffffff',
    'activityBar.inactiveForeground': '#ffffff66',
    'activityBar.border': '#6fc3df',
    'activityBarBadge.background': '#000000',
    'activityBarBadge.foreground': '#ffffff',
    
    'statusBar.background': '#000000',
    'statusBar.foreground': '#ffffff',
    'statusBar.border': '#6fc3df',
    'statusBar.debuggingBackground': '#cc6633',
    'statusBar.debuggingForeground': '#ffffff',
    'statusBar.noFolderBackground': '#68217a',
    
    'tab.activeBackground': '#000000',
    'tab.activeForeground': '#ffffff',
    'tab.inactiveBackground': '#000000',
    'tab.inactiveForeground': '#ffffff80',
    'tab.border': '#6fc3df',
    'tab.activeBorder': '#6fc3df',
    'tab.activeBorderTop': '#00000000',
    
    'panel.background': '#000000',
    'panel.border': '#6fc3df',
    'panelTitle.activeBorder': '#6fc3df',
    'panelTitle.activeForeground': '#ffffff',
    'panelTitle.inactiveForeground': '#ffffff99',
    
    'terminal.background': '#000000',
    'terminal.foreground': '#ffffff',
    'terminal.ansiBlack': '#000000',
    'terminal.ansiRed': '#cd3131',
    'terminal.ansiGreen': '#0dbc79',
    'terminal.ansiYellow': '#e5e510',
    'terminal.ansiBlue': '#2472c8',
    'terminal.ansiMagenta': '#bc3fbc',
    'terminal.ansiCyan': '#11a8cd',
    'terminal.ansiWhite': '#e5e5e5',
    'terminal.ansiBrightBlack': '#666666',
    'terminal.ansiBrightRed': '#f14c4c',
    'terminal.ansiBrightGreen': '#23d18b',
    'terminal.ansiBrightYellow': '#f5f543',
    'terminal.ansiBrightBlue': '#3b8eea',
    'terminal.ansiBrightMagenta': '#d670d6',
    'terminal.ansiBrightCyan': '#29b8db',
    'terminal.ansiBrightWhite': '#e5e5e5',
    
    'input.background': '#000000',
    'input.foreground': '#ffffff',
    'input.border': '#6fc3df',
    'input.placeholderForeground': '#ffffff80',
    'inputOption.activeBorder': '#6fc3df',
    'inputOption.activeBackground': '#6fc3df40',
    
    'button.background': '#000000',
    'button.foreground': '#ffffff',
    'button.hoverBackground': '#6fc3df',
    'button.secondaryBackground': '#000000',
    'button.secondaryForeground': '#ffffff',
    
    'list.activeSelectionBackground': '#000000',
    'list.activeSelectionForeground': '#ffffff',
    'list.hoverBackground': '#000000',
    'list.hoverForeground': '#ffffff',
    'list.inactiveSelectionBackground': '#000000',
    'list.highlightForeground': '#6fc3df',
    
    'focusBorder': '#6fc3df',
    
    'scrollbar.shadow': '#000000',
    'scrollbarSlider.background': '#6fc3df66',
    'scrollbarSlider.hoverBackground': '#6fc3dfb3',
    'scrollbarSlider.activeBackground': '#6fc3dfcc',
    
    'badge.background': '#000000',
    'badge.foreground': '#ffffff',
    
    'progressBar.background': '#6fc3df',
    
    'notifications.background': '#000000',
    'notifications.foreground': '#ffffff',
    'notifications.border': '#6fc3df',
  },
  tokenColors: [
    { scope: 'comment', settings: { foreground: '#7CA668' } },
    { scope: 'string', settings: { foreground: '#CE9178' } },
    { scope: 'constant.numeric', settings: { foreground: '#B5CEA8' } },
    { scope: 'constant.language', settings: { foreground: '#569CD6' } },
    { scope: 'keyword', settings: { foreground: '#569CD6' } },
    { scope: 'keyword.control', settings: { foreground: '#C586C0' } },
    { scope: 'keyword.operator', settings: { foreground: '#ffffff' } },
    { scope: 'storage.type', settings: { foreground: '#569CD6' } },
    { scope: 'storage.modifier', settings: { foreground: '#569CD6' } },
    { scope: 'entity.name.function', settings: { foreground: '#DCDCAA' } },
    { scope: 'entity.name.type', settings: { foreground: '#4EC9B0' } },
    { scope: 'entity.name.class', settings: { foreground: '#4EC9B0' } },
    { scope: 'variable', settings: { foreground: '#9CDCFE' } },
    { scope: 'variable.parameter', settings: { foreground: '#9CDCFE' } },
    { scope: 'support.function', settings: { foreground: '#DCDCAA' } },
    { scope: 'support.type', settings: { foreground: '#4EC9B0' } },
    { scope: 'punctuation', settings: { foreground: '#ffffff' } },
    { scope: 'meta.tag', settings: { foreground: '#808080' } },
    { scope: 'entity.name.tag', settings: { foreground: '#569CD6' } },
    { scope: 'entity.other.attribute-name', settings: { foreground: '#9CDCFE' } },
  ],
};

// ============================================================================
// CONTEXT
// ============================================================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ============================================================================
// PROVIDER
// ============================================================================

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'dark-plus',
}) => {
  const [themes, setThemes] = useState<Theme[]>([
    darkPlusTheme,
    lightPlusTheme,
    monokaiTheme,
    highContrastDarkTheme,
  ]);
  
  const [currentThemeId, setCurrentThemeId] = useState<string>(defaultTheme);
  
  // Load saved theme preference
  useEffect(() => {
    const saved = localStorage.getItem('aethel-theme');
    if (saved && themes.some(t => t.id === saved)) {
      setCurrentThemeId(saved);
    }
  }, [themes]);
  
  // Current theme object
  const theme = useMemo(() => {
    return themes.find(t => t.id === currentThemeId) || darkPlusTheme;
  }, [themes, currentThemeId]);
  
  // Set theme
  const setTheme = useCallback((themeId: string) => {
    if (themes.some(t => t.id === themeId)) {
      setCurrentThemeId(themeId);
      localStorage.setItem('aethel-theme', themeId);
    }
  }, [themes]);
  
  // Register custom theme
  const registerTheme = useCallback((newTheme: Theme) => {
    setThemes(prev => {
      const existing = prev.findIndex(t => t.id === newTheme.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newTheme;
        return updated;
      }
      return [...prev, newTheme];
    });
  }, []);
  
  // Get color helper
  const getColor = useCallback((key: keyof ThemeColors): string => {
    return theme.colors[key] || '#ff00ff'; // Magenta for missing colors
  }, [theme]);
  
  // Apply CSS variables
  useEffect(() => {
    const root = document.documentElement;
    
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssKey = `--${key.replace(/\./g, '-')}`;
      if (value !== undefined) {
        root.style.setProperty(cssKey, value);
      }
    });
    
    // Set data attribute for conditional CSS
    root.setAttribute('data-theme', theme.type);
  }, [theme]);
  
  const value: ThemeContextValue = useMemo(() => ({
    theme,
    themeType: theme.type,
    availableThemes: themes,
    setTheme,
    registerTheme,
    getColor,
    isDark: theme.type === 'dark' || theme.type === 'hc-dark',
    isHighContrast: theme.type === 'hc-dark' || theme.type === 'hc-light',
  }), [theme, themes, setTheme, registerTheme, getColor]);
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
