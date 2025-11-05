// Minimal ambient module declarations to reduce type errors during static checks.
declare module 'ollama' {
  export function predict(model: string, input: any): Promise<any>;
  export function load(model: string): Promise<any>;
  export function pull(opts: { model: string }): Promise<any>;
  export function generate(opts: any): Promise<any>;
  export default { predict, load, pull, generate };
}

declare module 'node-fetch' {
  import { RequestInit, Response } from 'node-fetch';
  function fetch(url: string, init?: RequestInit): Promise<Response>;
  export = fetch;
}

// Theia minimal shims (only names used by our package)
declare module '@theia/core' {
  export const FrontendApplication: any;
  export const CommandRegistry: any;
}

declare module '@theia/core/shared/inversify' {
  export const injectable: any;
}

declare module '@theia/core/lib/node/backend-application' {
  export interface BackendApplicationContribution {
    onStart?(): void;
    onStop?(): void;
  }
}

declare module '@theia/core/lib/common' {
  export type RpcConnectionHandler<T> = {
    path: string;
    handler: new (...args: any[]) => T | any;
  };
}

declare var process: any;
