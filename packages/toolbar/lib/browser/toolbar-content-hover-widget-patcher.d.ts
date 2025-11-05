import { ApplicationShell, FrontendApplication } from '@theia/core/lib/browser';
import { interfaces } from '@theia/core/shared/inversify';
import { DefaultContentHoverWidgetPatcher } from '@theia/monaco/lib/browser/default-content-hover-widget-patcher';
export declare class ToolbarContentHoverWidgetPatcher extends DefaultContentHoverWidgetPatcher {
    onStart(app: FrontendApplication): void;
    protected getTopPanelHeight(shell: ApplicationShell): number;
}
export declare const bindToolbarContentHoverWidgetPatcher: (bind: interfaces.Bind, rebind: interfaces.Rebind, unbind: interfaces.Unbind) => void;
//# sourceMappingURL=toolbar-content-hover-widget-patcher.d.ts.map