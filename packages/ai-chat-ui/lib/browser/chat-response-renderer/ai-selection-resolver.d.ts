import { RecursivePartial, URI } from '@theia/core';
import { EditorOpenerOptions, EditorWidget, Range } from '@theia/editor/lib/browser';
import { EditorSelectionResolver } from '@theia/editor/lib/browser/editor-manager';
import { DocumentSymbol } from '@theia/monaco-editor-core/esm/vs/editor/common/languages';
import { MonacoToProtocolConverter } from '@theia/monaco/lib/browser/monaco-to-protocol-converter';
/** Regex to match GitHub-style position and range declaration with line (L) and column (C) */
export declare const LOCATION_REGEX: RegExp;
export declare class GitHubSelectionResolver implements EditorSelectionResolver {
    priority: number;
    resolveSelection(widget: EditorWidget, options: EditorOpenerOptions, uri?: URI): Promise<RecursivePartial<Range> | undefined>;
}
export declare class TypeDocSymbolSelectionResolver implements EditorSelectionResolver {
    priority: number;
    protected readonly m2p: MonacoToProtocolConverter;
    resolveSelection(widget: EditorWidget, options: EditorOpenerOptions, uri?: URI): Promise<RecursivePartial<Range> | undefined>;
    protected findSymbolPath(uri: URI): string[] | undefined;
    protected findSymbolByPath(symbols: DocumentSymbol[], symbolPath: string[]): DocumentSymbol | undefined;
}
export declare class TextFragmentSelectionResolver implements EditorSelectionResolver {
    resolveSelection(widget: EditorWidget, options: EditorOpenerOptions, uri?: URI): Promise<RecursivePartial<Range> | undefined>;
    protected findFragment(uri: URI): string | undefined;
}
//# sourceMappingURL=ai-selection-resolver.d.ts.map