import { BrowserAutomation, type BrowserAutomationClient } from '../../common/browser-automation-protocol';

export class BrowserAutomationImpl extends BrowserAutomation {
	protected client: BrowserAutomationClient | undefined;

	setClient(client: BrowserAutomationClient): void {
		this.client = client;
	}

	close(): void {
		this.client = undefined;
	}
}
