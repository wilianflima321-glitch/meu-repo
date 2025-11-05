import { ElementHandle } from '@playwright/test';
import { TheiaOutputView } from './theia-output-view';
import { TheiaPageObject } from './theia-page-object';
import { TheiaMonacoEditor } from './theia-monaco-editor';
export interface TheiaOutputViewChannelData {
    viewSelector: string;
    dataUri: string;
    channelName: string;
}
export declare class TheiaOutputViewChannel extends TheiaPageObject {
    protected readonly data: TheiaOutputViewChannelData;
    protected readonly outputView: TheiaOutputView;
    protected monacoEditor: TheiaMonacoEditor;
    constructor(data: TheiaOutputViewChannelData, outputView: TheiaOutputView);
    protected get viewSelector(): string;
    protected get dataUri(): string | undefined;
    protected get channelName(): string | undefined;
    waitForVisible(): Promise<void>;
    isDisplayed(): Promise<boolean>;
    protected viewElement(): Promise<ElementHandle<SVGElement | HTMLElement> | null>;
    numberOfLines(): Promise<number | undefined>;
    maxSeverityOfLineByLineNumber(lineNumber: number): Promise<'error' | 'warning' | 'info'>;
    textContentOfLineByLineNumber(lineNumber: number): Promise<string | undefined>;
}
//# sourceMappingURL=theia-output-channel.d.ts.map