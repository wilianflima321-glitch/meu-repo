import { interfaces } from '@theia/core/shared/inversify';
import { PreferenceProxy, PreferenceSchema, PreferenceService } from '@theia/core/lib/common';
export declare const EditorPreviewConfigSchema: PreferenceSchema;
export interface EditorPreviewConfiguration {
    'editor.enablePreview': boolean;
}
export declare const EditorPreviewPreferenceContribution: unique symbol;
export declare const EditorPreviewPreferences: unique symbol;
export type EditorPreviewPreferences = PreferenceProxy<EditorPreviewConfiguration>;
export declare function createEditorPreviewPreferences(preferences: PreferenceService, schema?: PreferenceSchema): EditorPreviewPreferences;
export declare function bindEditorPreviewPreferences(bind: interfaces.Bind): void;
//# sourceMappingURL=editor-preview-preferences.d.ts.map