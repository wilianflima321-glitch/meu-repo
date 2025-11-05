/// <reference types="lodash" />
import { CompositeTreeNode } from '@theia/core/lib/browser';
import { Emitter, PreferenceConfigurations, PreferenceDataProperty, PreferenceSchemaService } from '@theia/core';
import { Preference } from './preference-types';
import { PreferenceLayoutProvider } from './preference-layout';
import { PreferenceTreeLabelProvider } from './preference-tree-label-provider';
export interface CreatePreferencesGroupOptions {
    id: string;
    group: string;
    root: CompositeTreeNode;
    expanded?: boolean;
    depth?: number;
    label?: string;
}
export declare class PreferenceTreeGenerator {
    protected readonly schemaProvider: PreferenceSchemaService;
    protected readonly preferenceConfigs: PreferenceConfigurations;
    protected readonly layoutProvider: PreferenceLayoutProvider;
    protected readonly labelProvider: PreferenceTreeLabelProvider;
    protected _root: CompositeTreeNode;
    protected _idCache: Map<string, string>;
    protected readonly onSchemaChangedEmitter: Emitter<CompositeTreeNode>;
    readonly onSchemaChanged: import("@theia/core").Event<CompositeTreeNode>;
    protected readonly defaultTopLevelCategory = "extensions";
    get root(): CompositeTreeNode;
    protected init(): void;
    protected doInit(): Promise<void>;
    generateTree(): CompositeTreeNode;
    protected createBuiltinLeafNode(name: string, property: PreferenceDataProperty, root: CompositeTreeNode, groups: Map<string, Preference.CompositeTreeNode>): void;
    protected createPluginLeafNode(name: string, property: PreferenceDataProperty, root: CompositeTreeNode, groups: Map<string, Preference.CompositeTreeNode>): void;
    getNodeId(preferenceId: string): string;
    protected getParents(name: string, root: CompositeTreeNode, groups: Map<string, Preference.CompositeTreeNode>): {
        topLevelParent: Preference.CompositeTreeNode;
        immediateParent: Preference.CompositeTreeNode | undefined;
    };
    protected getGroupName(labels: string[]): string;
    protected getSubgroupName(labels: string[], computedGroupName: string): string | undefined;
    protected generateName(id: string): string;
    doHandleChangedSchema(): void;
    handleChangedSchema: import("lodash").DebouncedFunc<() => void>;
    protected createRootNode(): CompositeTreeNode;
    protected createLeafNode(property: string, preferencesGroup: Preference.CompositeTreeNode, data: PreferenceDataProperty): Preference.LeafNode;
    protected createPreferencesGroup(options: CreatePreferencesGroupOptions): Preference.CompositeTreeNode;
    protected getOrCreatePreferencesGroup(options: CreatePreferencesGroupOptions & {
        groups: Map<string, Preference.CompositeTreeNode>;
    }): Preference.CompositeTreeNode;
}
//# sourceMappingURL=preference-tree-generator.d.ts.map