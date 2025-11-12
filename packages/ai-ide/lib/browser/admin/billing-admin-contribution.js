"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingAdminContribution = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("inversify");
const browser_1 = require("@theia/core/lib/browser");
const billing_admin_widget_1 = require("./billing-admin-widget");
let BillingAdminContribution = class BillingAdminContribution {
    widgetManager;
    async openWidget() {
        const widget = await this.widgetManager.getOrCreateWidget(billing_admin_widget_1.BillingAdminWidget.ID);
        widget.activate();
    }
};
exports.BillingAdminContribution = BillingAdminContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.WidgetManager),
    tslib_1.__metadata("design:type", browser_1.WidgetManager)
], BillingAdminContribution.prototype, "widgetManager", void 0);
exports.BillingAdminContribution = BillingAdminContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], BillingAdminContribution);
//# sourceMappingURL=billing-admin-contribution.js.map