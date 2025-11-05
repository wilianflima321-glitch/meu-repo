import { ChatProgressMessage } from '@theia/ai-chat';
import * as React from '@theia/core/shared/react';
export type ProgressMessageProps = Omit<ChatProgressMessage, 'kind' | 'id' | 'show'>;
export declare const ProgressMessage: (c: ProgressMessageProps) => React.JSX.Element;
export declare const Indicator: (progressMessage: ProgressMessageProps) => React.JSX.Element;
//# sourceMappingURL=chat-progress-message.d.ts.map