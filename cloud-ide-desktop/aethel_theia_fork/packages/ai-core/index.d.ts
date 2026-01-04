// Root type re-exports for local dev
export * from './lib/common/index';
// NOTE: './lib/index' is not present in this repo checkout.

export interface ToolInvocationRegistry {
	getAllFunctions(): Array<{ name: string }>;
	onDidChange(listener: () => void): any;
}

export const ToolInvocationRegistry: unique symbol;

