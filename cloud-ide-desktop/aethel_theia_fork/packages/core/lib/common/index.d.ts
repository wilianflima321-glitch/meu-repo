export interface Disposable {
  dispose(): void;
}

export class DisposableCollection implements Disposable {
  protected readonly disposables: Disposable[];
  constructor(...disposables: Disposable[]);
  push(disposable: Disposable): Disposable;
  dispose(): void;
}

export type Event<T> = (listener: (event: T) => any) => Disposable;

export class Emitter<T> implements Disposable {
  protected listeners: Array<(event: T) => any>;
  readonly event: Event<T>;
  fire(event: T): void;
  dispose(): void;
}

export class URI {
  readonly path: string;
  constructor(path: string);
  toString(): string;
}

export enum PreferenceScope {
  Default = 0,
  User = 1,
  Workspace = 2,
  Folder = 3,
}

export interface PreferenceService {
  get<T>(preferenceName: string, defaultValue?: T, scope?: PreferenceScope): T;
  set(preferenceName: string, value: any, scope?: PreferenceScope): Promise<void>;
  onPreferenceChanged(listener: (e: { preferenceName?: string }) => void): Disposable;
  updateValue(preferenceName: string, value: any): Promise<void>;
}

export const PreferenceService: unique symbol;

export interface MessageService {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export const nls: {
  localize(id: string, defaultMessage: string, ...args: any[]): string;
};

export function generateUuid(): string;
