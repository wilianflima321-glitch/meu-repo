import { Range } from '@theia/core/shared/vscode-languageserver-protocol';
import { LineRange } from './line-range';
import * as monaco from '@theia/monaco-editor-core';
/**
 * Represents an edit, expressed in whole lines:
 * At (before) {@link LineRange.startLineNumber}, delete {@link LineRange.lineCount} many lines and insert {@link newLines}.
 */
export declare class LineRangeEdit {
    readonly range: LineRange;
    readonly newLines: string[];
    constructor(range: LineRange, newLines: string[]);
    equals(other: LineRangeEdit): boolean;
    toRangeEdit(documentLineCount: number): RangeEdit;
}
export declare class RangeEdit {
    readonly range: Range;
    readonly newText: string;
    constructor(range: Range, newText: string);
    toMonacoEdit(): monaco.editor.ISingleEditOperation;
}
//# sourceMappingURL=range-editing.d.ts.map