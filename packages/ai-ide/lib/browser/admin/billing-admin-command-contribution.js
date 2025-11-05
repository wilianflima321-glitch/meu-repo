"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingAdminCommandContribution = exports.BillingAdminCommands = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("inversify");
const billing_admin_contribution_1 = require("./billing-admin-contribution");
exports.BillingAdminCommands = {
    OPEN: {
        id: 'ai-ide.billing.open',
        label: 'Open Billing Admin'
    }
};
let BillingAdminCommandContribution = class BillingAdminCommandContribution {
    contribution;
    registerCommands(commands) {
        commands.registerCommand(exports.BillingAdminCommands.OPEN, {
            execute: () => this.contribution.openWidget()
        });
    }
};
exports.BillingAdminCommandContribution = BillingAdminCommandContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(billing_admin_contribution_1.BillingAdminContribution),
    tslib_1.__metadata("design:type", billing_admin_contribution_1.BillingAdminContribution)
], BillingAdminCommandContribution.prototype, "contribution", void 0);
exports.BillingAdminCommandContribution = BillingAdminCommandContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], BillingAdminCommandContribution);
//# sourceMappingURL=billing-admin-command-contribution.js.map