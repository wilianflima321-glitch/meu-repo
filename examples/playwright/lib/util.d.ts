import { ElementHandle } from '@playwright/test';
export declare const USER_KEY_TYPING_DELAY = 80;
export declare function normalizeId(nodeId: string): string;
export declare function toTextContentArray(items: ElementHandle<SVGElement | HTMLElement>[]): Promise<string[]>;
export declare function isDefined(content: string | undefined): content is string;
export declare function isNotNull(content: string | null): content is string;
export declare function textContent(elementPromise: Promise<ElementHandle<SVGElement | HTMLElement> | null>): Promise<string | undefined>;
export declare function containsClass(elementPromise: Promise<ElementHandle<SVGElement | HTMLElement> | null> | undefined, cssClass: string): Promise<boolean>;
export declare function elementContainsClass(element: ElementHandle<SVGElement | HTMLElement> | null | undefined, cssClass: string): Promise<boolean>;
export declare function isElementVisible(elementPromise: Promise<ElementHandle<SVGElement | HTMLElement> | null>): Promise<boolean>;
export declare function elementId(element: ElementHandle<SVGElement | HTMLElement>): Promise<string>;
export declare namespace OSUtil {
    const isWindows: boolean;
    const isMacOS: boolean;
    const fileSeparator: "\\" | "/";
    const tmpDir: string;
}
//# sourceMappingURL=util.d.ts.map