import { EventBus } from './EventBus';

export interface LayoutState {
  sidebarVisible: boolean;
  sidebarWidth: number;
  panelVisible: boolean;
  panelHeight: number;
  activityBarVisible: boolean;
  statusBarVisible: boolean;
  editorGroups: EditorGroup[];
}

export interface EditorGroup {
  id: string;
  editors: string[];
  activeEditor: string | null;
  direction: 'horizontal' | 'vertical';
  sizes: number[];
}

export class LayoutService {
  private static instance: LayoutService;
  private state: LayoutState;
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.state = this.getDefaultLayout();
    this.loadLayout();
  }

  public static getInstance(): LayoutService {
    if (!LayoutService.instance) {
      LayoutService.instance = new LayoutService();
    }
    return LayoutService.instance;
  }

  private getDefaultLayout(): LayoutState {
    return {
      sidebarVisible: true,
      sidebarWidth: 300,
      panelVisible: true,
      panelHeight: 300,
      activityBarVisible: true,
      statusBarVisible: true,
      editorGroups: [
        {
          id: 'main',
          editors: [],
          activeEditor: null,
          direction: 'horizontal',
          sizes: [100]
        }
      ]
    };
  }

  private loadLayout(): void {
    try {
      const saved = localStorage.getItem('ide-layout');
      if (saved) {
        this.state = { ...this.getDefaultLayout(), ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load layout:', error);
    }
  }

  private saveLayout(): void {
    try {
      localStorage.setItem('ide-layout', JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  }

  public getLayout(): LayoutState {
    return { ...this.state };
  }

  public toggleSidebar(): void {
    this.state.sidebarVisible = !this.state.sidebarVisible;
    this.saveLayout();
    this.eventBus.emit('layout:changed', { layout: this.getLayout() });
  }

  public setSidebarWidth(width: number): void {
    this.state.sidebarWidth = Math.max(200, Math.min(width, 600));
    this.saveLayout();
    this.eventBus.emit('layout:changed', { layout: this.getLayout() });
  }

  public togglePanel(): void {
    this.state.panelVisible = !this.state.panelVisible;
    this.saveLayout();
    this.eventBus.emit('layout:changed', { layout: this.getLayout() });
  }

  public setPanelHeight(height: number): void {
    this.state.panelHeight = Math.max(100, Math.min(height, 800));
    this.saveLayout();
    this.eventBus.emit('layout:changed', { layout: this.getLayout() });
  }

  public toggleActivityBar(): void {
    this.state.activityBarVisible = !this.state.activityBarVisible;
    this.saveLayout();
    this.eventBus.emit('layout:changed', { layout: this.getLayout() });
  }

  public toggleStatusBar(): void {
    this.state.statusBarVisible = !this.state.statusBarVisible;
    this.saveLayout();
    this.eventBus.emit('layout:changed', { layout: this.getLayout() });
  }

  public splitEditor(groupId: string, direction: 'horizontal' | 'vertical'): void {
    const group = this.state.editorGroups.find(g => g.id === groupId);
    if (!group) return;

    const newGroupId = `group-${Date.now()}`;
    const newGroup: EditorGroup = {
      id: newGroupId,
      editors: [],
      activeEditor: null,
      direction,
      sizes: [50, 50]
    };

    this.state.editorGroups.push(newGroup);
    this.saveLayout();
    this.eventBus.emit('layout:editorGroupAdded', { groupId: newGroupId });
  }

  public closeEditorGroup(groupId: string): void {
    if (this.state.editorGroups.length <= 1) return;

    this.state.editorGroups = this.state.editorGroups.filter(g => g.id !== groupId);
    this.saveLayout();
    this.eventBus.emit('layout:editorGroupRemoved', { groupId });
  }

  public setEditorGroupSizes(groupId: string, sizes: number[]): void {
    const group = this.state.editorGroups.find(g => g.id === groupId);
    if (group) {
      group.sizes = sizes;
      this.saveLayout();
    }
  }

  public resetLayout(): void {
    this.state = this.getDefaultLayout();
    this.saveLayout();
    this.eventBus.emit('layout:reset', {});
  }

  public getEditorGroup(groupId: string): EditorGroup | undefined {
    return this.state.editorGroups.find(g => g.id === groupId);
  }

  public getAllEditorGroups(): EditorGroup[] {
    return [...this.state.editorGroups];
  }
}
