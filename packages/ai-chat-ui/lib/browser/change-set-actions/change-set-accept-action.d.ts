import * as React from '@theia/core/shared/react';
import { ChangeSetActionRenderer } from './change-set-action-service';
import { ChangeSet } from '@theia/ai-chat';
export declare class ChangeSetAcceptAction implements ChangeSetActionRenderer {
    readonly id = "change-set-accept-action";
    canRender(changeSet: ChangeSet): boolean;
    render(changeSet: ChangeSet): React.ReactNode;
}
//# sourceMappingURL=change-set-accept-action.d.ts.map