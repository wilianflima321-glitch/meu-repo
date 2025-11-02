import { injectable, inject } from 'inversify';
import { CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import { BillingAdminContribution } from './billing-admin-contribution';

export const BillingAdminCommands = {
    OPEN: {
        id: 'ai-ide.billing.open',
        label: 'Open Billing Admin'
    }
};

@injectable()
export class BillingAdminCommandContribution implements CommandContribution {
    private _contribution?: BillingAdminContribution;
    @inject(BillingAdminContribution)
    protected set contribution(v: BillingAdminContribution) { this._contribution = v; }
    protected get contribution(): BillingAdminContribution { if (!this._contribution) { throw new Error('BillingAdminCommandContribution: contribution not injected'); } return this._contribution; }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(BillingAdminCommands.OPEN, {
            execute: () => this.contribution.openWidget()
        });
    }
}
