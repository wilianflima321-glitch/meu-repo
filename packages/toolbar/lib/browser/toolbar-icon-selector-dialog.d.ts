/// <reference types="lodash" />
/// <reference types="react" />
import * as React from '@theia/core/shared/react';
import { Root } from '@theia/core/shared/react-dom/client';
import { interfaces } from '@theia/core/shared/inversify';
import { ReactDialog } from '@theia/core/lib/browser/dialogs/react-dialog';
import { DialogProps, Message } from '@theia/core/lib/browser';
import { Command } from '@theia/core';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { Deferred } from '@theia/core/lib/common/promise-util';
import PerfectScrollbar from 'perfect-scrollbar';
import { FuzzySearch } from '@theia/core/lib/browser/tree/fuzzy-search';
import { IconSet } from './toolbar-interfaces';
import { ReactInteraction } from './toolbar-constants';
export interface ToolbarIconDialogFactory {
    (command: Command): ToolbarIconSelectorDialog;
}
export declare const ToolbarIconDialogFactory: unique symbol;
export declare const ToolbarCommand: unique symbol;
export declare const FontAwesomeIcons: unique symbol;
export declare const CodiconIcons: unique symbol;
export declare class ToolbarIconSelectorDialog extends ReactDialog<string | undefined> {
    protected readonly props: DialogProps;
    protected readonly toolbarCommand: Command;
    protected readonly fileService: FileService;
    protected readonly faIcons: string[];
    protected readonly codiconIcons: string[];
    protected readonly fuzzySearch: FuzzySearch;
    static ID: string;
    protected deferredScrollContainer: Deferred<HTMLDivElement>;
    scrollOptions: PerfectScrollbar.Options;
    protected filterRef: HTMLInputElement;
    protected selectedIcon: string | undefined;
    protected activeIconPrefix: IconSet;
    protected iconSets: Map<string, string[]>;
    protected filteredIcons: string[];
    protected doShowFilterPlaceholder: boolean;
    protected debounceHandleSearch: import("lodash").DebouncedFunc<any>;
    protected controlPanelRoot: Root;
    constructor(props: DialogProps);
    protected onUpdateRequest(msg: Message): void;
    protected init(): void;
    getScrollContainer(): Promise<HTMLElement>;
    protected assignScrollContainerRef: (element: HTMLDivElement) => void;
    protected doAssignScrollContainerRef(element: HTMLDivElement): void;
    protected assignFilterRef: (element: HTMLInputElement) => void;
    protected doAssignFilterRef(element: HTMLInputElement): void;
    get value(): string | undefined;
    protected handleSelectOnChange: (e: React.ChangeEvent<HTMLSelectElement>) => Promise<void>;
    protected doHandleSelectOnChange(e: React.ChangeEvent<HTMLSelectElement>): Promise<void>;
    protected renderIconSelectorOptions(): React.ReactNode;
    protected renderIconGrid(): React.ReactNode;
    protected render(): React.ReactNode;
    protected doHandleSearch(): Promise<void>;
    protected handleOnIconClick: (e: ReactInteraction<HTMLDivElement>) => void;
    protected doHandleOnIconClick(e: ReactInteraction<HTMLDivElement>): void;
    protected handleOnIconBlur: (e: React.FocusEvent<HTMLDivElement>) => void;
    protected doHandleOnIconBlur(e: React.FocusEvent<HTMLDivElement>): void;
    protected doAccept: (e: ReactInteraction<HTMLButtonElement>) => void;
    protected doClose: () => void;
    protected renderControls(): React.ReactElement;
}
export declare const ICON_DIALOG_WIDTH = 600;
export declare const ICON_DIALOG_PADDING = 24;
export declare const bindToolbarIconDialog: (bind: interfaces.Bind) => void;
//# sourceMappingURL=toolbar-icon-selector-dialog.d.ts.map