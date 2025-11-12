import { TheiaApp } from './theia-app';
import { TheiaOutputViewChannel } from './theia-output-channel';
import { TheiaView } from './theia-view';
export declare class TheiaOutputView extends TheiaView {
    constructor(app: TheiaApp);
    isOutputChannelSelected(outputChannelName: string): Promise<boolean>;
    getOutputChannel(outputChannelName: string): Promise<TheiaOutputViewChannel | undefined>;
    selectOutputChannel(outputChannelName: string): Promise<boolean>;
}
//# sourceMappingURL=theia-output-view.d.ts.map