import { Page } from '@playwright/test';
import { TheiaApp } from './theia-app';
export declare abstract class TheiaPageObject {
    app: TheiaApp;
    constructor(app: TheiaApp);
    get page(): Page;
}
//# sourceMappingURL=theia-page-object.d.ts.map