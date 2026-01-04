// Type declarations for node-pty
// These are simplified types for development. Install the actual package for runtime.

declare module 'node-pty' {
  export interface IPtyForkOptions {
    name?: string;
    cols?: number;
    rows?: number;
    cwd?: string;
    env?: { [key: string]: string | undefined };
    encoding?: string | null;
    useConpty?: boolean;
    handleFlowControl?: boolean;
    flowControlPause?: string;
    flowControlResume?: string;
  }

  export interface IDisposable {
    dispose(): void;
  }

  export interface IPty extends IDisposable {
    readonly pid: number;
    readonly cols: number;
    readonly rows: number;
    readonly process: string;
    readonly handleFlowControl: boolean;
    
    onData: IEvent<string>;
    onExit: IEvent<{ exitCode: number; signal?: number }>;
    
    resize(columns: number, rows: number): void;
    clear(): void;
    write(data: string): void;
    kill(signal?: string): void;
    pause(): void;
    resume(): void;
  }

  export interface IEvent<T> {
    (listener: (data: T) => void): IDisposable;
  }

  export function spawn(
    file: string,
    args: string[] | string,
    options?: IPtyForkOptions
  ): IPty;
}
