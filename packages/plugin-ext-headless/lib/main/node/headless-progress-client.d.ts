import { CancellationToken, ProgressClient, ProgressMessage, ProgressUpdate } from '@theia/core';
/**
 * A simple progress client for headless plugins that just writes debug messages to the console
 * because there is no one connected frontend to which it is appropriate to send the messages.
 */
export declare class HeadlessProgressClient implements ProgressClient {
    showProgress(_progressId: string, message: ProgressMessage, cancellationToken: CancellationToken): Promise<string | undefined>;
    reportProgress(_progressId: string, update: ProgressUpdate, message: ProgressMessage, cancellationToken: CancellationToken): Promise<void>;
}
//# sourceMappingURL=headless-progress-client.d.ts.map