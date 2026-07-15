import type { RuntimeEntity } from './types';
import { LevelManager } from './manager';

export interface LevelCommand {
  execute(): void;
  undo(): void;
  description: string;
}

export class LevelHistory {
  private undoStack: LevelCommand[] = [];
  private redoStack: LevelCommand[] = [];
  private maxHistory: number = 100;

  execute(command: LevelCommand): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];

    // Limit history size
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  undo(): boolean {
    const command = this.undoStack.pop();
    if (!command) return false;

    command.undo();
    this.redoStack.push(command);
    return true;
  }

  redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) return false;

    command.execute();
    this.undoStack.push(command);
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoHistory(): string[] {
    return this.undoStack.map(c => c.description);
  }

  getRedoHistory(): string[] {
    return this.redoStack.map(c => c.description);
  }
}

// Built-in commands

export class AddEntityCommand implements LevelCommand {
  description: string;
  private manager: LevelManager;
  private entity: RuntimeEntity;
  private id: string = '';

  constructor(manager: LevelManager, entity: RuntimeEntity) {
    this.manager = manager;
    this.entity = entity;
    this.description = `Add entity: ${entity.name || 'Entity'}`;
  }

  execute(): void {
    this.id = this.manager.addEntity(this.entity);
  }

  undo(): void {
    this.manager.removeEntity(this.id);
  }
}

export class RemoveEntityCommand implements LevelCommand {
  description: string;
  private manager: LevelManager;
  private entityId: string;
  private entityData: RuntimeEntity | null = null;
  private childrenData: RuntimeEntity[] = [];

  constructor(manager: LevelManager, entityId: string) {
    this.manager = manager;
    this.entityId = entityId;
    this.description = `Remove entity`;
  }

  execute(): void {
    // Store entity data for undo
    this.entityData = this.manager.getEntity(this.entityId);

    // Store children data
    const level = this.manager.getCurrentLevel();
    if (level) {
      this.childrenData = level.entities.filter((e: RuntimeEntity) => e.parentId === this.entityId);
    }

    this.manager.removeEntity(this.entityId);
  }

  undo(): void {
    if (this.entityData) {
      this.manager.addEntity({ ...this.entityData });

      for (const child of this.childrenData) {
        this.manager.addEntity({ ...child });
      }
    }
  }
}

export class ModifyEntityCommand implements LevelCommand {
  description: string;
  private manager: LevelManager;
  private entityId: string;
  private newData: Partial<RuntimeEntity>;
  private oldData: Partial<RuntimeEntity> = {};

  constructor(manager: LevelManager, entityId: string, newData: Partial<RuntimeEntity>) {
    this.manager = manager;
    this.entityId = entityId;
    this.newData = newData;
    this.description = `Modify entity`;
  }

  execute(): void {
    const entity = this.manager.getEntity(this.entityId);
    if (!entity) return;

    // Store old values
    for (const key of Object.keys(this.newData)) {
      this.oldData[key] = JSON.parse(JSON.stringify(entity[key]));
    }

    // Apply new values
    Object.assign(entity, JSON.parse(JSON.stringify(this.newData)));
  }

  undo(): void {
    const entity = this.manager.getEntity(this.entityId);
    if (!entity) return;

    Object.assign(entity, JSON.parse(JSON.stringify(this.oldData)));
  }
}
