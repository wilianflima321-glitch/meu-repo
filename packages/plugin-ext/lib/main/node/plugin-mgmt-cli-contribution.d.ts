/// <reference types="yargs" />
import { Argv, Arguments } from '@theia/core/shared/yargs';
import { CliContribution } from '@theia/core/lib/node/cli';
import { PluginDeployerHandlerImpl } from '../../hosted/node/plugin-deployer-handler-impl';
export declare class PluginMgmtCliContribution implements CliContribution {
    static LIST_PLUGINS: string;
    static SHOW_VERSIONS: string;
    static SHOW_BUILTINS: string;
    protected deployerHandler: PluginDeployerHandlerImpl;
    configure(conf: Argv): void;
    setArguments(args: Arguments): void;
}
//# sourceMappingURL=plugin-mgmt-cli-contribution.d.ts.map