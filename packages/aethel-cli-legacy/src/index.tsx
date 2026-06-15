import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// Initialize services
import { EventBus } from './services/EventBus';
import { FileSystemService } from './services/FileSystemService';
import { EditorService } from './services/EditorService';
import { WorkspaceService } from './services/WorkspaceService';
import { LanguageService } from './services/LanguageService';
import { DiagnosticsService } from './services/DiagnosticsService';
import { DebugService } from './services/DebugService';
import { ExtensionService } from './services/ExtensionService';
import { ThemeService } from './services/ThemeService';
import { KeybindingService } from './services/KeybindingService';
import { SettingsService } from './services/SettingsService';
import { SearchService } from './services/SearchService';
import { GitService } from './services/GitService';
import { TerminalService } from './services/TerminalService';
import { TaskService } from './services/TaskService';
import { SnippetService } from './services/SnippetService';
import { FormattingService } from './services/FormattingService';
import { RefactoringService } from './services/RefactoringService';
import { TestingService } from './services/TestingService';
import { NotificationService } from './services/NotificationService';
import { QuickOpenService } from './services/QuickOpenService';
import { OutputService } from './services/OutputService';
import { ProblemsService } from './services/ProblemsService';
import { BreakpointService } from './services/BreakpointService';
import { WatchService } from './services/WatchService';
import { LayoutService } from './services/LayoutService';

// Initialize all services
const initializeServices = () => {
  console.log('Initializing IDE services...');

  // Core services
  EventBus.getInstance();
  FileSystemService.getInstance();
  EditorService.getInstance();
  WorkspaceService.getInstance();
  LayoutService.getInstance();

  // Language services
  LanguageService.getInstance();
  DiagnosticsService.getInstance();
  FormattingService.getInstance();
  RefactoringService.getInstance();

  // Debug services
  DebugService.getInstance();
  BreakpointService.getInstance();
  WatchService.getInstance();

  // Extension services
  ExtensionService.getInstance();
  ThemeService.getInstance();
  KeybindingService.getInstance();
  SettingsService.getInstance();

  // Search and navigation
  SearchService.getInstance();
  QuickOpenService.getInstance();

  // Version control
  GitService.getInstance();

  // Terminal and tasks
  TerminalService.getInstance();
  TaskService.getInstance();

  // Code features
  SnippetService.getInstance();
  TestingService.getInstance();

  // UI services
  NotificationService.getInstance();
  OutputService.getInstance();
  ProblemsService.getInstance();

  console.log('All services initialized successfully');
};

// Initialize services before rendering
initializeServices();

// Render app
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  NotificationService.getInstance().showNotification({
    message: `Error: ${event.error?.message || 'Unknown error'}`,
    type: 'error'
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  NotificationService.getInstance().showNotification({
    message: `Promise rejection: ${event.reason?.message || 'Unknown error'}`,
    type: 'error'
  });
});

// Log startup
console.log('Professional IDE started successfully');
console.log('Version: 1.0.0');
console.log('Environment:', process.env.NODE_ENV);
