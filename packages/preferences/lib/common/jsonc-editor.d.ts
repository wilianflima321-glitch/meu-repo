import * as jsoncparser from 'jsonc-parser';
import { JSONValue } from '@theia/core/shared/@lumino/coreutils';
import { PreferenceService } from '@theia/core';
export declare class JSONCEditor {
    protected readonly preferenceService: PreferenceService;
    setValue(model: string, path: jsoncparser.JSONPath, value: JSONValue): string;
    protected getEditOperations(content: string, path: jsoncparser.JSONPath, value: JSONValue): jsoncparser.Edit[];
    getEOL(): string;
}
//# sourceMappingURL=jsonc-editor.d.ts.map