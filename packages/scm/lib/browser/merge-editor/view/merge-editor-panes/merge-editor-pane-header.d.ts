/// <reference types="react" />
import * as React from '@theia/core/shared/react';
import { Message, ReactWidget } from '@theia/core/lib/browser';
import { LabelParser } from '@theia/core/lib/browser/label-parser';
export declare class MergeEditorPaneHeader extends ReactWidget {
    protected readonly labelParser: LabelParser;
    private _description;
    get description(): string;
    set description(description: string);
    private _detail;
    get detail(): string;
    set detail(detail: string);
    private _toolbarItems;
    get toolbarItems(): readonly MergeEditorPaneToolbarItem[];
    set toolbarItems(toolbarItems: readonly MergeEditorPaneToolbarItem[]);
    protected init(): void;
    protected onActivateRequest(msg: Message): void;
    protected render(): React.ReactNode;
    private readonly handleToolbarClick;
    protected renderWithIcons(text: string): React.ReactNode[];
    protected renderToolbarItem({ id, label, tooltip, className, onClick }: MergeEditorPaneToolbarItem): React.ReactNode;
}
export interface MergeEditorPaneToolbarItem {
    readonly id: string;
    readonly label?: string;
    readonly tooltip?: string;
    readonly className?: string;
    readonly onClick?: (event: React.MouseEvent) => void;
}
//# sourceMappingURL=merge-editor-pane-header.d.ts.map