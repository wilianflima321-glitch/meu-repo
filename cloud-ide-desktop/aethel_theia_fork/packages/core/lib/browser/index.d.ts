export type Widget = any;

export class ReactWidget {
  id: string;
  title: any;
  protected readonly toDispose: any[];
  update(): void;
  protected render(): any;
  dispose(): void;
  protected onActivateRequest(msg: any): void;
  addClass(className: string): void;
  node: any;
  isAttached?: boolean;
}

export class BaseWidget {
  id: string;
  title: any;
}

export class ApplicationShell {
  addWidget(widget: Widget, options?: any): void;
  activateWidget(id: string): Promise<void>;
  leftPanelHandler: any;
  rightPanelHandler: any;
}
export namespace ApplicationShell {
  export type Area = 'left' | 'right' | 'main' | 'top' | 'bottom';
}

export class WidgetManager {
  getOrCreateWidget(id: string): Promise<Widget>;
}
export interface Disposable { dispose(): void }

export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
}

export interface QuickPick<T extends QuickPickItem> extends Disposable {
  items: readonly T[];
  title?: string;
  placeholder?: string;
  canSelectMany?: boolean;
  selectedItems: readonly T[];
  show(): void;
  hide(): void;
  onDidAccept(listener: () => void): Disposable;
  onDidHide(listener: () => void): Disposable;
}

export class QuickInputService {
  open(placeholder?: string): Promise<string | undefined>;
  createQuickPick<T extends QuickPickItem>(): QuickPick<T>;
}
export class ConfirmDialog {
  constructor(options: any);
  open(): Promise<boolean>;
}

export function codicon(id: string): string;

export class FrontendApplication {
  shell: ApplicationShell;
}
export interface FrontendApplicationContribution {}
export const FrontendApplicationContribution: unique symbol;

export interface TabBarToolbarContribution {}
export const TabBarToolbarContribution: unique symbol;

export interface WidgetFactory {
  id: string;
  createWidget(): Promise<Widget>;
}
export const WidgetFactory: unique symbol;

export function bindViewContribution(...args: any[]): void;
export class RemoteConnectionProvider {}
export class ServiceConnectionProvider {
  createProxy<T = any>(path: string): T;
}

export interface Message {
  type?: string;
  text?: string;
}
