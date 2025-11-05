/// <reference types="react" />
import { LanguageModelExchange } from '@theia/ai-core/lib/common/language-model-interaction-model';
import * as React from '@theia/core/shared/react';
export interface ExchangeCardProps {
    exchange: LanguageModelExchange;
    selectedAgentId?: string;
    compactView?: boolean;
    renderNewlines?: boolean;
}
export declare const ExchangeCard: React.FC<ExchangeCardProps>;
//# sourceMappingURL=ai-history-exchange-card.d.ts.map