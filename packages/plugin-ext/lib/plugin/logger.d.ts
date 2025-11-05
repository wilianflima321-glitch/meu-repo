import { LogLevel } from '../common';
import { RPCProtocol } from '../common/rpc-protocol';
export declare class PluginLogger {
    private readonly logger;
    private readonly name?;
    constructor(rpc: RPCProtocol, name?: string);
    trace(message: string, ...params: any[]): void;
    debug(message: string, ...params: any[]): void;
    log(logLevel: LogLevel, message: string, ...params: any[]): void;
    info(message: string, ...params: any[]): void;
    warn(message: string, ...params: any[]): void;
    error(message: string, ...params: any[]): void;
    private sendLog;
    private toLog;
}
//# sourceMappingURL=logger.d.ts.map