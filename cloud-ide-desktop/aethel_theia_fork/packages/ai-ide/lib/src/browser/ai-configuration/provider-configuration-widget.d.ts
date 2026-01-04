import * as React from '@theia/core/shared/react';
import { BaseWidget, WidgetManager } from '@theia/core/lib/browser';
import { LlmProviderRegistry } from '../../browser/llm-provider-registry';
import { MessageService } from '@theia/core';
import { LlmProviderConfig } from '../../common/ai-llm-preferences';
type ExtendedLlmProviderConfig = LlmProviderConfig & {
    type?: 'custom' | 'aethel' | 'ensemble';
    providerIds?: string[];
    mode?: 'fast' | 'blend' | 'best';
    timeoutMs?: number;
    constraints?: string[];
    verificationMode?: 'strict' | 'soft';
    rateCard?: {
        pricePerToken?: number;
        currency?: string;
    };
};
export declare const ProviderConfigurationWidgetID = "ai-llm-provider-configuration-widget";
interface State {
    id: string;
    name: string;
    endpoint: string;
    apiKey: string;
    providers: ExtendedLlmProviderConfig[];
    selected?: string;
    billingMode?: 'platform' | 'self' | 'sponsored';
    pricePerToken?: number;
    currency?: string;
    ownerId?: string;
    type?: string;
    providerIds?: string;
    mode?: 'fast' | 'blend' | 'best';
    timeoutMs?: number;
    constraints?: string;
    verificationMode?: 'strict' | 'soft';
}
export declare class ProviderConfigurationWidget extends BaseWidget {
    static ID: string;
    private _widgetManager?;
    protected set widgetManager(v: WidgetManager);
    protected get widgetManager(): WidgetManager;
    private _registry?;
    protected set registry(v: LlmProviderRegistry);
    protected get registry(): LlmProviderRegistry;
    private _messageService?;
    protected set messageService(v: MessageService);
    protected get messageService(): MessageService;
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
