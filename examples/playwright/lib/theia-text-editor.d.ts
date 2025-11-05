import { ElementHandle, Locator } from '@playwright/test';
import { TheiaApp } from './theia-app';
import { TheiaEditor } from './theia-editor';
import { TheiaMonacoEditor } from './theia-monaco-editor';
export declare class TheiaTextEditor extends TheiaEditor {
    protected monacoEditor: TheiaMonacoEditor;
    constructor(filePath: string, app: TheiaApp);
    numberOfLines(): Promise<number | undefined>;
    textContentOfLineByLineNumber(lineNumber: number): Promise<string | undefined>;
    replaceLineWithLineNumber(text: string, lineNumber: number): Promise<void>;
    protected typeTextAndHitEnter(text: string): Promise<void>;
    selectLineWithLineNumber(lineNumber: number): Promise<ElementHandle<SVGElement | HTMLElement> | undefined>;
    placeCursorInLineWithLineNumber(lineNumber: number): Promise<ElementHandle<SVGElement | HTMLElement> | undefined>;
    deleteLineByLineNumber(lineNumber: number): Promise<void>;
    textContentOfLineContainingText(text: string): Promise<string | undefined>;
    replaceLineContainingText(newText: string, oldText: string): Promise<void>;
    selectLineContainingText(text: string): Promise<ElementHandle<SVGElement | HTMLElement> | undefined>;
    placeCursorInLineContainingText(text: string): Promise<ElementHandle<SVGElement | HTMLElement> | undefined>;
    deleteLineContainingText(text: string): Promise<void>;
    addTextToNewLineAfterLineContainingText(textContainedByExistingLine: string, newText: string): Promise<void>;
    addTextToNewLineAfterLineByLineNumber(lineNumber: number, newText: string): Promise<void>;
    protected selectLine(lineLocator: Locator | undefined): Promise<void>;
    protected placeCursorInLine(lineLocator: Locator | undefined): Promise<void>;
    protected selectedSuggestion(): Promise<ElementHandle<SVGElement | HTMLElement>>;
    getSelectedSuggestionText(): Promise<string>;
}
//# sourceMappingURL=theia-text-editor.d.ts.map