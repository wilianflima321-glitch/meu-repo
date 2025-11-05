import { Command, CommandHandler, Emitter, Event } from '@theia/core';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
export declare const RemoteRegistryContribution: unique symbol;
export interface RemoteRegistryContribution {
    registerRemoteCommands(registry: RemoteRegistry): void;
}
export declare abstract class AbstractRemoteRegistryContribution implements RemoteRegistryContribution {
    protected readonly windowService: WindowService;
    abstract registerRemoteCommands(registry: RemoteRegistry): void;
    protected openRemote(port: string, newWindow: boolean, workspace?: string): void;
}
export declare class RemoteRegistry {
    protected _commands: Command[];
    protected onDidRegisterCommandEmitter: Emitter<[Command, CommandHandler | undefined]>;
    get commands(): readonly Command[];
    get onDidRegisterCommand(): Event<[Command, CommandHandler | undefined]>;
    registerCommand(command: Command, handler?: CommandHandler): void;
}
//# sourceMappingURL=remote-registry-contribution.d.ts.map