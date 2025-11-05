declare module 'puppeteer-core' {
    export interface LaunchOptions {
        headless?: boolean;
        channel?: string;
        args?: string[];
        [key: string]: unknown;
    }

    export interface ElementHandle<T = unknown> {
        dispose?(): Promise<void>;
    }

    export interface Page {
        $(selector: string): Promise<ElementHandle | null>;
        content(): Promise<string>;
        evaluate<T>(pageFunction: (...args: unknown[]) => T | Promise<T>, ...args: unknown[]): Promise<T>;
    }

    export interface Browser {
        connected: boolean;
        pages(): Promise<Page[]>;
        close(): Promise<void>;
    }

    export function launch(options?: LaunchOptions): Promise<Browser>;
}
