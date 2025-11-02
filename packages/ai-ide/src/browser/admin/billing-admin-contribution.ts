import { injectable, inject } from 'inversify';
import { WidgetManager } from '@theia/core/lib/browser';
import { BillingAdminWidget } from './billing-admin-widget';

@injectable()
export class BillingAdminContribution {
    private _widgetManager?: WidgetManager;
    @inject(WidgetManager)
    protected set widgetManager(v: WidgetManager) { this._widgetManager = v; }
    protected get widgetManager(): WidgetManager { if (!this._widgetManager) { throw new Error('BillingAdminContribution: widgetManager not injected'); } return this._widgetManager; }

    async openWidget() {
        const widget = await this.widgetManager.getOrCreateWidget(BillingAdminWidget.ID);
        widget.activate();
    }
}
