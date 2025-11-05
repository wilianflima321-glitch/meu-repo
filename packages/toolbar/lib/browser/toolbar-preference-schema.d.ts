import { IJSONSchema } from '@theia/core/lib/common/json-schema';
import { DeflatedToolbarTree } from './toolbar-interfaces';
export declare const toolbarSchemaId = "vscode://schemas/toolbar";
export declare const toolbarConfigurationSchema: IJSONSchema;
export declare function isToolbarPreferences(candidate: unknown): candidate is DeflatedToolbarTree;
//# sourceMappingURL=toolbar-preference-schema.d.ts.map