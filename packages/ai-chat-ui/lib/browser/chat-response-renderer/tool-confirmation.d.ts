import * as React from '@theia/core/shared/react';
import { ToolCallChatResponseContent } from '@theia/ai-chat/lib/common';
/**
 * States the tool confirmation component can be in
 */
export type ToolConfirmationState = 'waiting' | 'allowed' | 'denied' | 'rejected';
export interface ToolConfirmationProps {
    response: ToolCallChatResponseContent;
    onAllow: (mode?: 'once' | 'session' | 'forever') => void;
    onDeny: (mode?: 'once' | 'session' | 'forever') => void;
}
/**
 * Component that displays approval/denial buttons for tool execution
 */
export declare const ToolConfirmation: React.FC<ToolConfirmationProps>;
//# sourceMappingURL=tool-confirmation.d.ts.map