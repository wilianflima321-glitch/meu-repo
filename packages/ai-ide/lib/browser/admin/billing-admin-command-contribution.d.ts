import { CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import { BillingAdminContribution } from './billing-admin-contribution';
export declare const BillingAdminCommands: {
    OPEN: {
        id: string;
        label: string;
    };
};
export declare class BillingAdminCommandContribution implements CommandContribution {
    protected readonly contribution: BillingAdminContribution;
    registerCommands(commands: CommandRegistry): void;
}
//# sourceMappingURL=billing-admin-command-contribution.d.ts.map