import { Position, Range, TextEditorDocument } from '@theia/editor/lib/browser/editor';
import { LineRange } from './line-range';
import { LineRangeEdit } from './range-editing';
/**
 * Maps a line range in the original text document to a line range in the modified text document.
 */
export declare class LineRangeMapping {
    readonly originalRange: LineRange;
    readonly modifiedRange: LineRange;
    static join(mappings: readonly LineRangeMapping[]): LineRangeMapping | undefined;
    constructor(originalRange: LineRange, modifiedRange: LineRange);
    toString(): string;
    join(other: LineRangeMapping): LineRangeMapping;
    addModifiedLineDelta(delta: number): LineRangeMapping;
    addOriginalLineDelta(delta: number): LineRangeMapping;
    reverse(): LineRangeMapping;
}
/**
 * Represents a total monotonous mapping of line ranges in one document to another document.
 */
export declare class DocumentLineRangeMap {
    /**
     * The line range mappings that define this document mapping.
     * The number of lines between two adjacent original ranges must equal the number of lines between their corresponding modified ranges.
     */
    readonly lineRangeMappings: readonly LineRangeMapping[];
    static betweenModifiedSides(side1Diff: readonly LineRangeMapping[], side2Diff: readonly LineRangeMapping[]): DocumentLineRangeMap;
    constructor(
    /**
     * The line range mappings that define this document mapping.
     * The number of lines between two adjacent original ranges must equal the number of lines between their corresponding modified ranges.
     */
    lineRangeMappings: readonly LineRangeMapping[]);
    /**
     * @param lineNumber 0-based line number in the original text document
     */
    projectLine(lineNumber: number): LineRangeMapping;
    reverse(): DocumentLineRangeMap;
}
/**
 * Aligns mappings for two modified sides with a common base range.
 */
export declare class MappingAlignment<T extends LineRangeMapping> {
    readonly baseRange: LineRange;
    readonly side1Range: LineRange;
    readonly side1Mappings: readonly T[];
    readonly side2Range: LineRange;
    readonly side2Mappings: readonly T[];
    static computeAlignments<T extends LineRangeMapping>(side1Mappings: readonly T[], side2Mappings: readonly T[]): MappingAlignment<T>[];
    constructor(baseRange: LineRange, side1Range: LineRange, side1Mappings: readonly T[], side2Range: LineRange, side2Mappings: readonly T[]);
    toString(): string;
}
/**
 * A line range mapping with inner range mappings.
 */
export declare class DetailedLineRangeMapping extends LineRangeMapping {
    readonly originalDocument: TextEditorDocument;
    readonly modifiedDocument: TextEditorDocument;
    static join(mappings: readonly DetailedLineRangeMapping[]): DetailedLineRangeMapping | undefined;
    readonly rangeMappings: readonly RangeMapping[];
    constructor(originalRange: LineRange, originalDocument: TextEditorDocument, modifiedRange: LineRange, modifiedDocument: TextEditorDocument, rangeMappings?: readonly RangeMapping[]);
    join(other: DetailedLineRangeMapping): DetailedLineRangeMapping;
    addModifiedLineDelta(delta: number): DetailedLineRangeMapping;
    addOriginalLineDelta(delta: number): DetailedLineRangeMapping;
    reverse(): DetailedLineRangeMapping;
    getLineEdit(): LineRangeEdit;
    getReverseLineEdit(): LineRangeEdit;
    getModifiedLines(): string[];
    getOriginalLines(): string[];
}
/**
 * Maps a range in the original text document to a range in the modified text document.
 */
export declare class RangeMapping {
    readonly originalRange: Readonly<Range>;
    readonly modifiedRange: Readonly<Range>;
    constructor(originalRange: Readonly<Range>, modifiedRange: Readonly<Range>);
    toString(): string;
    addModifiedLineDelta(deltaLines: number): RangeMapping;
    addOriginalLineDelta(deltaLines: number): RangeMapping;
    reverse(): RangeMapping;
}
/**
 * Represents a total monotonous mapping of ranges in one document to another document.
 */
export declare class DocumentRangeMap {
    /**
     * The range mappings that define this document mapping.
     */
    readonly rangeMappings: readonly RangeMapping[];
    constructor(
    /**
     * The range mappings that define this document mapping.
     */
    rangeMappings: readonly RangeMapping[]);
    /**
     * @param position position in the original text document
     */
    projectPosition(position: Position): RangeMapping;
    /**
     * @param range range in the original text document
     */
    projectRange(range: Range): RangeMapping;
    reverse(): DocumentRangeMap;
}
//# sourceMappingURL=range-mapping.d.ts.map