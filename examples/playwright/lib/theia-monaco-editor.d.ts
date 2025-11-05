import { ElementHandle, Locator } from '@playwright/test';
import { TheiaPageObject } from './theia-page-object';
import { TheiaApp } from './theia-app';
/**
 * Monaco editor page object.
 *
 * Note: The constructor overload using `selector: string` is deprecated. Use the `locator: Locator` overload instead.
 *
 */
export declare class TheiaMonacoEditor extends TheiaPageObject {
    readonly locator: Locator;
    protected readonly LINES_SELECTOR = ".view-lines > .view-line";
    /**
     * Monaco editor page object.
     *
     * @param locator The locator of the editor.
     * @param app  The Theia app instance.
     */
    constructor(locator: Locator, app: TheiaApp);
    /**
     * @deprecated Use the `constructor(locator: Locator, app: TheiaApp)` overload instead.
     */
    constructor(selector: string, app: TheiaApp);
    waitForVisible(): Promise<void>;
    /**
     * @deprecated Use `locator` instead. To get the element handle use `await locator.elementHandle()`.
     * @returns The view element of the editor.
     */
    protected viewElement(): Promise<ElementHandle<SVGElement | HTMLElement> | null>;
    numberOfLines(): Promise<number>;
    textContentOfLineByLineNumber(lineNumber: number): Promise<string | undefined>;
    /**
     * @deprecated Use `line(lineNumber: number)` instead.
     * @param lineNumber The line number to retrieve.
     * @returns The line element of the editor.
     */
    lineByLineNumber(lineNumber: number): Promise<ElementHandle<SVGElement | HTMLElement> | undefined>;
    line(lineNumber: number): Promise<Locator>;
    textContentOfLineContainingText(text: string): Promise<string | undefined>;
    /**
     * @deprecated Use `lineWithText(text: string)` instead.
     * @param text The text to search for in the editor.
     * @returns  The line element containing the text.
     */
    lineContainingText(text: string): Promise<ElementHandle<SVGElement | HTMLElement> | undefined>;
    lineWithText(text: string): Promise<Locator | undefined>;
    /**
     * @returns The text content of the editor.
     */
    editorText(): Promise<string | undefined>;
    /**
     * Adds text to the editor.
     * @param text  The text to add to the editor.
     * @param lineNumber  The line number where to add the text. Default is 1.
     */
    addEditorText(text: string, lineNumber?: number): Promise<void>;
    /**
     * @returns `true` if the editor is focused, `false` otherwise.
     */
    isFocused(): Promise<boolean>;
    protected replaceEditorSymbolsWithSpace(content: string): string | Promise<string | undefined>;
}
//# sourceMappingURL=theia-monaco-editor.d.ts.map