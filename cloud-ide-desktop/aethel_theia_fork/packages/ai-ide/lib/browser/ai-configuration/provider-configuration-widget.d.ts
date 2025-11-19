import * as React from 'react';
import { BaseWidget, WidgetManager } from '@theia/core/lib/browser';
import { LlmProviderRegistry } from '../../browser/llm-provider-registry';
import { MessageService } from '@theia/core';
export declare const ProviderConfigurationWidgetID = "ai-llm-provider-configuration-widget";
interface State {
    id: string;
    name: string;
    endpoint: string;
    apiKey: string;
    providers: any[];
    selected?: string;
    billingMode?: 'platform' | 'self' | 'sponsored';
    pricePerToken?: number;
    currency?: string;
    ownerId?: string;
}
export declare class ProviderConfigurationWidget extends BaseWidget {
    static ID: string;
    protected readonly widgetManager: WidgetManager;
    protected readonly registry: LlmProviderRegistry;
    protected readonly messageService: MessageService;
    protected state: State;
    constructor();
    protected init(): Promise<void>;
    protected render(): React.ReactNode;
    protected save(): void;
    protected clear(): void;
    protected selectProvider(id: string): void;
    protected deleteProvider(id: string): void;
}
export {};
//# sourceMappingURL=provider-configuration-widget.d.ts.map