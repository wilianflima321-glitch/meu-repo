import { Page, PlaywrightWorkerArgs } from '@playwright/test';
import { TheiaApp } from './theia-app';
import { TheiaWorkspace } from './theia-workspace';
export interface TheiaAppFactory<T extends TheiaApp> {
    new (page: Page, initialWorkspace: TheiaWorkspace, isElectron?: boolean): T;
}
export interface TheiaPlaywrightTestConfig {
    useElectron?: {
        /** Path to the Theia Electron app package (absolute or relative to this package). */
        electronAppPath?: string;
        /** Path to the folder containing the plugins to load (absolute or relative to this package). */
        pluginsPath?: string;
        /** Electron launch options as [specified by Playwright](https://github.com/microsoft/playwright/blob/396487fc4c19bf27554eac9beea9db135e96cfb4/packages/playwright-core/types/types.d.ts#L14182). */
        launchOptions?: object;
    };
}
export declare namespace TheiaAppLoader {
    function load<T extends TheiaApp>(args: TheiaPlaywrightTestConfig & PlaywrightWorkerArgs, initialWorkspace?: TheiaWorkspace, factory?: TheiaAppFactory<T>): Promise<T>;
}
//# sourceMappingURL=theia-app-loader.d.ts.map