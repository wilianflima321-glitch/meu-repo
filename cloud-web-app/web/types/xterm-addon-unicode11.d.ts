/**
 * Type declarations for xterm-addon-unicode11
 * @see https://github.com/AO2324-00/xterm-addon-unicode11
 */

declare module 'xterm-addon-unicode11' {
  import { Terminal, ITerminalAddon } from 'xterm';

  export class Unicode11Addon implements ITerminalAddon {
    constructor();
    
    /**
     * Activates the addon
     * @param terminal The terminal the addon is being loaded in.
     */
    activate(terminal: Terminal): void;
    
    /**
     * Disposes the addon.
     */
    dispose(): void;
  }
}

// Also extend xterm Terminal type to include unicode property
declare module 'xterm' {
  interface Terminal {
    unicode?: {
      activeVersion: string;
      register(provider: IUnicodeVersionProvider): void;
      versions: string[];
    };
  }

  interface IUnicodeVersionProvider {
    readonly version: string;
    wcwidth(codePoint: number): 0 | 1 | 2;
  }
}
