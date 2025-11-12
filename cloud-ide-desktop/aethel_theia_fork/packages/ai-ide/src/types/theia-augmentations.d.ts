/* Temporary augmentations to help the ai-ide package typecheck while
   the workspace is being aligned. These are intentionally permissive
   and should be removed once the core types / project references are
   correctly restored. */

declare module '@theia/core/lib/browser' {
    // Merge with the exported ReactWidget class to provide a few
    // instance members the ai-ide package expects to exist at compile time.
    interface ReactWidget {
        /** Widget id (often provided by Lumino Widget) */
        id: string;
        /** Title object (label/closable/caption etc.) */
        title: { label: string; closable: boolean; caption?: string };
        /** Convenience: request an update/render */
        update: () => void;
        /** Add CSS class */
        addClass: (cls: string) => void;
        /** Collection used by many widgets to track disposables */
        toDispose: Array<{ dispose?: () => void }>;
    }
}

// Also provide a minimal augmentation for QuickInput-like objects used in the package.
declare module '@theia/core/lib/browser/quick-input' {
    interface QuickPick<T = any> {
        title: string;
        placeholder?: string;
        items?: T[];
        selectedItems?: T[];
        show: () => void;
        dispose: () => void;
        onDidAccept: (cb: () => void) => { dispose: () => void };
    }
}

// Generic fallback so small utility code referring to `nls.localize` compiles.
declare module '@theia/core' {
    const nls: {
        // Accept variable arguments (format placeholders) — permissive for now.
        localize: (key: string, def: string, ...args: any[]) => string;
    };
}

// Minimal inversify types to satisfy lightweight imports in ai-ide until proper types are restored.
declare module 'inversify' {
    // Provide a minimal `interfaces` namespace with the commonly used types
    // so code that refers to `interfaces.Context` / `interfaces.Bind` compiles.
    export namespace interfaces {
        export type Context = any;
        export type Bind = any;
        export type Unbind = any;
        export type IsBound = any;
        export type Rebind = any;
    }
    export class ContainerModule {
        constructor(cb: (bind: any, unbind: any, isBound: any, rebind: any) => void);
    }
}
declare module '@theia/core/lib/browser' {
    // Minimal augmentations to help the ai-ide package compile while
    // we iterate on resolving upstream typings. These are conservative
    // surface additions mirroring Theia widget behaviors used by the
    // package (id, title, update, disposal helpers, and class helpers).

    // Title from lumino can be any shape for our quick augmentation.
    type TitleLike = { label?: string; caption?: string; closable?: boolean } & Record<string, any>;

    interface BaseWidget {
        /** stable id for widget */
        id: string;
        /** title object used by panels */
        title: TitleLike;
        /** request an update/render */
        update(): void;
        /** lightweight push-disposable helper */
        protected toDispose: Array<{ dispose: () => void } | (() => void)>;
        /** helper to add a disposable-like value */
        protected pushDisposable(d: unknown): void;
        /** convenience to add CSS classes to the widget's node */
        addClass(className: string): void;
    }

    interface ReactWidget extends BaseWidget { }
}

export {};
