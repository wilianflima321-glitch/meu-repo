import { CommandRegistry, CommandContribution } from '@theia/core/lib/common';
import { HostedPluginManagerClient } from './hosted-plugin-manager-client';
export declare class HostedPluginFrontendContribution implements CommandContribution {
    protected readonly hostedPluginManagerClient: HostedPluginManagerClient;
    registerCommands(commands: CommandRegistry): void;
}
//# sourceMappingURL=hosted-plugin-frontend-contribution.d.ts.map