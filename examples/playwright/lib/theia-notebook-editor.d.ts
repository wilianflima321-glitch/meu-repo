import { Locator } from '@playwright/test';
import { TheiaApp } from './theia-app';
import { TheiaEditor } from './theia-editor';
import { TheiaNotebookCell } from './theia-notebook-cell';
import { TheiaNotebookToolbar } from './theia-notebook-toolbar';
import { TheiaToolbarItem } from './theia-toolbar-item';
export declare namespace NotebookCommands {
    const SELECT_KERNEL_COMMAND = "notebook.selectKernel";
    const ADD_NEW_CELL_COMMAND = "notebook.add-new-code-cell";
    const ADD_NEW_MARKDOWN_CELL_COMMAND = "notebook.add-new-markdown-cell";
    const EXECUTE_NOTEBOOK_COMMAND = "notebook.execute";
    const CLEAR_ALL_OUTPUTS_COMMAND = "notebook.clear-all-outputs";
    const EXPORT_COMMAND = "jupyter.notebookeditor.export";
}
export declare class TheiaNotebookEditor extends TheiaEditor {
    constructor(filePath: string, app: TheiaApp);
    protected viewLocator(): Locator;
    tabLocator(): Locator;
    waitForVisible(): Promise<void>;
    /**
     * @returns The main toolbar of the notebook editor.
     */
    notebookToolbar(): TheiaNotebookToolbar;
    /**
     * @returns The name of the selected kernel.
     */
    selectedKernel(): Promise<string | undefined | null>;
    /**
     *  Allows to select a kernel using toolbar item.
     * @param kernelName  The name of the kernel to select.
     */
    selectKernel(kernelName: string): Promise<void>;
    availableKernels(): Promise<string[]>;
    /**
     * Adds a new code cell to the notebook.
     */
    addCodeCell(): Promise<void>;
    /**
     * Adds a new markdown cell to the notebook.
     */
    addMarkdownCell(): Promise<void>;
    waitForCellCountChanged(prevCount: number): Promise<void>;
    executeAllCells(): Promise<void>;
    clearAllOutputs(): Promise<void>;
    exportAs(): Promise<void>;
    cells(): Promise<TheiaNotebookCell[]>;
    protected triggerToolbarItem(id: string): Promise<void>;
    protected toolbarItem(id: string): Promise<TheiaToolbarItem | undefined>;
}
//# sourceMappingURL=theia-notebook-editor.d.ts.map