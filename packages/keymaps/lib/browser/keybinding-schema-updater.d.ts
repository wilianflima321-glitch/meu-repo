import { CommandRegistry } from '@theia/core/lib/common';
import { JsonSchemaContribution, JsonSchemaDataStore, JsonSchemaRegisterContext } from '@theia/core/lib/browser/json-schema-store';
import URI from '@theia/core/lib/common/uri';
export declare class KeybindingSchemaUpdater implements JsonSchemaContribution {
    protected readonly uri: URI;
    protected readonly commandRegistry: CommandRegistry;
    protected readonly schemaStore: JsonSchemaDataStore;
    protected init(): void;
    registerSchemas(store: JsonSchemaRegisterContext): void;
    protected updateSchema(): void;
}
export declare const keybindingSchema: {
    readonly $id: "vscode://schemas/keybindings";
    readonly type: "array";
    readonly title: "Keybinding Configuration File";
    readonly default: [];
    readonly definitions: {
        readonly key: {
            readonly type: "string";
            readonly description: string;
        };
    };
    readonly items: {
        readonly type: "object";
        readonly defaultSnippets: [{
            readonly body: {
                readonly key: "$1";
                readonly command: "$2";
                readonly when: "$3";
            };
        }];
        readonly allOf: [{
            readonly required: ["command"];
            readonly properties: {
                readonly command: {
                    readonly anyOf: [{
                        readonly type: "string";
                    }, {
                        readonly enum: string[];
                        readonly enumDescriptions: string[];
                    }];
                    readonly description: string;
                };
                readonly when: {
                    readonly type: "string";
                    readonly description: string;
                };
                readonly args: {
                    readonly description: string;
                };
                readonly context: {
                    readonly type: "string";
                    readonly description: string;
                    readonly deprecationMessage: string;
                };
            };
        }, {
            readonly anyOf: [{
                readonly required: ["key"];
                readonly properties: {
                    readonly key: {
                        readonly $ref: "#/definitions/key";
                    };
                };
            }, {
                readonly required: ["keybinding"];
                readonly properties: {
                    readonly keybinding: {
                        readonly $ref: "#/definitions/key";
                    };
                };
            }];
        }];
    };
    readonly allowComments: true;
    readonly allowTrailingCommas: true;
};
//# sourceMappingURL=keybinding-schema-updater.d.ts.map