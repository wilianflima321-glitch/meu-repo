import { interfaces } from '@theia/core/shared/inversify';
import { LoggerMain, LogLevel } from '../../common';
export declare class LoggerMainImpl implements LoggerMain {
    private readonly container;
    constructor(container: interfaces.Container);
    $log(level: LogLevel, name: string | undefined, message: string, params: any[]): void;
}
//# sourceMappingURL=logger-main.d.ts.map