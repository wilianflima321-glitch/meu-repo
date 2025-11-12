import { Range } from '@theia/core/shared/vscode-languageserver-protocol';
import { TextEditorDocument } from '@theia/editor/lib/browser/editor';
/**
 * Represents a range of whole lines of text. Line numbers are zero-based.
 */
export declare class LineRange {
    /** A zero-based number of the start line. The range starts exactly at the beginning of this line. */
    readonly startLineNumber: number;
    readonly lineCount: number;
    static compareByStart(a: LineRange, b: LineRange): number;
    static fromLineNumbers(startLineNumber: number, endExclusiveLineNumber: number): LineRange;
    constructor(
    /** A zero-based number of the start line. The range starts exactly at the beginning of this line. */
    startLineNumber: number, lineCount: number);
    join(other: LineRange): LineRange;
    /** A zero-based number of the end line. The range ends just before the beginning of this line. */
    get endLineNumberExclusive(): number;
    get isEmpty(): boolean;
    /**
     * Returns `false` if there is at least one line between `this` and `other`.
     */
    touches(other: LineRange): boolean;
    isAfter(other: LineRange): boolean;
    isBefore(other: LineRange): boolean;
    delta(lineDelta: number): LineRange;
    deltaStart(lineDelta: number): LineRange;
    deltaEnd(lineDelta: number): LineRange;
    toString(): string;
    equals(other: LineRange): boolean;
    contains(other: LineRange): boolean;
    containsLine(lineNumber: number): boolean;
    getLines(document: TextEditorDocument): string[];
    toRange(): Range;
    toInclusiveRange(): Range | undefined;
    toInclusiveRangeOrEmpty(): Range;
}
//# sourceMappingURL=line-range.d.ts.map