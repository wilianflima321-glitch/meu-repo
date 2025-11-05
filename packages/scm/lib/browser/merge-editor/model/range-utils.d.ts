import { Position, Range } from '@theia/core/shared/vscode-languageserver-protocol';
export declare namespace RangeUtils {
    function isEmpty(range: Range): boolean;
    function containsPosition(range: Range, position: Position): boolean;
    function isBeforeOrTouching(range: Range, other: Range): boolean;
    function union(range: Range, other: Range): Range;
    /**
     * A function that compares ranges, useful for sorting ranges.
     * It will first compare ranges on the start position and then on the end position.
     */
    function compareUsingStarts(range: Range, other: Range): number;
}
export declare namespace PositionUtils {
    function isBeforeOrEqual(position: Position, other: Position): boolean;
    function compare(position: Position, other: Position): number;
    /**
     * Given two positions, computes the relative position of the greater position against the lesser position.
     */
    function relativize(position: Position, other: Position): Position;
    /**
     * Resolves the given relative position against the given position and returns the resulting position.
     */
    function resolve(position: Position, relativePosition: Position): Position;
}
//# sourceMappingURL=range-utils.d.ts.map