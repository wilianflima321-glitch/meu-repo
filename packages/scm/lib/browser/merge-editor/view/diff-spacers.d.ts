import { LineRangeMapping } from '../model/range-mapping';
export interface DiffSpacers {
    /**
     * An array representing spacers in the original side of the diff.
     * Indices are line numbers in the original document, and values are the height in lines of the spacer directly above the given line.
     * If a value is missing for a line number, the corresponding spacer is assumed to have zero height.
     */
    originalSpacers: number[];
    /**
     * An array representing spacers in the modified side of the diff.
     * Indices are line numbers in the modified document, and values are the height in lines of the spacer directly above the given line.
     * If a value is missing for a line number, the corresponding spacer is assumed to have zero height.
     */
    modifiedSpacers: number[];
    /**
     * An array respresenting a mapping of line numbers for the diff.
     * Indices are line numbers in the original document, and values are the corresponding line numbers in the modified document.
     * If a value is missing for a line number, it is assumed that the line was deleted.
     */
    lineMapping: number[];
}
export type ModifiedSideSpacers = Omit<DiffSpacers, 'originalSpacers'>;
export interface CombinedMultiDiffSpacers {
    originalSpacers: number[];
    modifiedSides: ModifiedSideSpacers[];
}
export declare class DiffSpacerService {
    computeDiffSpacers(changes: readonly LineRangeMapping[], originalLineCount: number): DiffSpacers;
    /**
     * Combines multiple {@link DiffSpacers} objects into a {@link CombinedMultiDiffSpacers} object with the appropriately adjusted spacers.
     * The given {@link DiffSpacers} objects are not modified.
     *
     * It is assumed that all of the given {@link DiffSpacers} objects have been computed from diffs against the same original side.
     */
    combineMultiDiffSpacers(multiDiffSpacers: DiffSpacers[]): CombinedMultiDiffSpacers;
    /**
     * Given a {@link CombinedMultiDiffSpacers} object, excludes the original side, returning the modified sides with the appropriately adjusted spacers.
     * The given {@link CombinedMultiDiffSpacers} object is not modified.
     */
    excludeOriginalSide({ modifiedSides }: CombinedMultiDiffSpacers): {
        modifiedSides: {
            modifiedSpacers: number[];
        }[];
    };
    protected checkLineMappingsHaveEqualLength(items: {
        lineMapping: number[];
    }[]): void;
    protected projectLine(originalLine: number, lineMapping: number[]): number;
}
//# sourceMappingURL=diff-spacers.d.ts.map