import { FrameLocator, Locator } from '@playwright/test';
import { TheiaApp } from './theia-app';
import { TheiaMonacoEditor } from './theia-monaco-editor';
import { TheiaPageObject } from './theia-page-object';
export type CellStatus = 'success' | 'error' | 'waiting';
/**
 * Page object for a Theia notebook cell.
 */
export declare class TheiaNotebookCell extends TheiaPageObject {
    readonly locator: Locator;
    protected readonly notebookEditorLocator: Locator;
    protected cellEditor: TheiaNotebookCellEditor;
    constructor(locator: Locator, notebookEditorLocator: Locator, app: TheiaApp);
    /**
     * @returns The cell editor page object.
     */
    get editor(): TheiaNotebookCellEditor;
    /**
     * @returns Locator for the sidebar (left) of the cell.
     */
    sidebar(): Locator;
    /**
     * @returns Locator for the toolbar (top) of the cell.
     */
    toolbar(): Locator;
    /**
     * @returns Locator for the statusbar (bottom) of the cell.
     */
    statusbar(): Locator;
    /**
     * @returns Locator for the status icon inside the statusbar of the cell.
     */
    statusIcon(): Locator;
    /**
     * @returns `true` id the cell is a code cell, `false` otherwise.
     */
    isCodeCell(): Promise<boolean>;
    /**
     * @returns The mode of the cell, e.g. 'python', 'markdown', etc.
     */
    mode(): Promise<string>;
    /**
     * @returns The text content of the cell editor.
     */
    editorText(): Promise<string | undefined>;
    /**
     * Adds text to the editor of the cell.
     * @param text  The text to add to the editor.
     * @param lineNumber  The line number where to add the text. Default is 1.
     */
    addEditorText(text: string, lineNumber?: number): Promise<void>;
    /**
     * @param wait If `true` waits for the cell to finish execution, otherwise returns immediately.
     */
    execute(wait?: boolean): Promise<void>;
    /**
     * Splits the cell into two cells by dividing the cell text on current cursor position.
     */
    splitCell(): Promise<void>;
    /**
     * Deletes the cell.
     */
    deleteCell(): Promise<void>;
    /**
     *  Waits for the cell to reach success or error status.
     */
    waitForCellToFinish(): Promise<void>;
    /**
     * @returns The status of the cell. Possible values are 'success', 'error', 'waiting'.
     */
    status(): Promise<CellStatus>;
    protected toCellStatus(classes: string): CellStatus;
    /**
     * @param acceptEmpty If `true`, accepts empty execution count. Otherwise waits for the execution count to be set.
     * @returns The execution count of the cell.
     */
    executionCount(acceptEmpty?: boolean): Promise<string | undefined>;
    /**
     * @returns `true` if the cell is selected (blue vertical line), `false` otherwise.
     */
    isSelected(): Promise<boolean>;
    /**
     * @returns The output text of the cell.
     */
    outputText(): Promise<string>;
    /**
     * Selects the cell itself not it's editor. Important for shortcut usage like copy-, cut-, paste-cell.
     */
    selectCell(): Promise<void>;
    outputContainer(): Promise<Locator>;
    protected cellHandle(): Promise<string | null>;
    protected outputFrame(): Promise<FrameLocator>;
}
/**
 * Wrapper around the monaco editor inside a notebook cell.
 */
export declare class TheiaNotebookCellEditor extends TheiaPageObject {
    readonly locator: Locator;
    readonly monacoEditor: TheiaMonacoEditor;
    constructor(locator: Locator, app: TheiaApp);
    waitForVisible(): Promise<void>;
    isVisible(): Promise<boolean>;
}
//# sourceMappingURL=theia-notebook-cell.d.ts.map