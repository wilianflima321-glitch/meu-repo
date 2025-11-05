declare module '@theia/core/lib/common' {
  export type PreferenceScope = 'User' | 'Workspace' | 'Folder' | string;
  export const PreferenceScope: { User: 'User', Workspace: 'Workspace', Folder: 'Folder' };
  export interface PreferenceService {
    ready?: Promise<void>;
    get<T = any>(key: string, fallback?: T, resource?: any): T;
    set?(key: string, value: any, scope?: PreferenceScope): Promise<void> | void;
    updateValue?(key: string, value: any): Promise<void> | void;
    onPreferenceChanged?(cb: (e: { preferenceName: string }) => void): void;
  }
  // provide a value that can be used as injection key
  export const PreferenceService: new (...args: any[]) => PreferenceService;
  export type PreferenceSchema = any;
  export interface PreferenceProxy<T> { [k: string]: any }
  export interface PreferenceProxyFactory { (schema: PreferenceSchema): PreferenceProxy<any> }
  export const environment: { electron?: { is: () => boolean } };

  // Command related
  export interface CommandContribution { registerCommands(registry: CommandRegistry): void }
  export class CommandRegistry { registerCommand(cmd: any, impl?: any): void; }

  // URI and small helper used by many modules
  export class URI {
    constructor(s?: string);
    static parse(s: string): URI;
    static fromString(s: string): URI;
    toString(): string;
    path?: string | { toString(): string };
  }

  export const nls: {
    localize(key: string, fallback: string): string;
    localizeByDefault(key: string): string;
    getDefaultKey(key: string): string;
  };
}

declare module '@theia/core/lib/common/nls' {
  export const nls: {
    localize(key: string, fallback: string): string;
    localizeByDefault(key: string): string;
    getDefaultKey(key: string): string;
  };
}

// minimal declaration for nls used elsewhere
declare module '@theia/core/lib/common/nls' {
  export function localize(key: string, fallback: string): string;
  export function localizeByDefault(key: string): string;
  export function getDefaultKey(key: string): string;
}
