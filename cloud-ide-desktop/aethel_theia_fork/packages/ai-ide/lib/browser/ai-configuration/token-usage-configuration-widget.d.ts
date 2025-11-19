import { ReactWidget } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';
import { MessageService } from '@theia/core';
import { TokenUsageFrontendService, ModelTokenUsageData } from '@theia/ai-core/lib/browser/token-usage-frontend-service';
export declare class AITokenUsageConfigurationWidget extends ReactWidget {
    static readonly ID = "ai-token-usage-configuration-container-widget";
    static readonly LABEL: any;
    protected tokenUsageData: ModelTokenUsageData[];
    protected readonly messageService: MessageService;
    protected readonly tokenUsageService: TokenUsageFrontendService;
    protected init(): void;
    protected refreshData(): Promise<void>;
    protected formatNumber(num: number): string;
    protected formatDate(date?: Date): string;
    protected hasCacheData(): boolean;
    protected renderHeaderRow(): React.ReactNode;
    protected renderModelRow(model: ModelTokenUsageData): React.ReactNode;
    protected renderSummaryRow(): React.ReactNode;
    protected render(): React.ReactNode;
}
//# sourceMappingURL=token-usage-configuration-widget.d.ts.map