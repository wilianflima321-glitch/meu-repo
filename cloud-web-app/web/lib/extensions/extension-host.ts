/**
 * Extension Host (Web)
 *
 * Camada de orquestração sobre o ExtensionLoader.
 * - Carrega extensões VS Code-like quando disponíveis
 * - Mantém comportamento real-or-fail (sem extensões instaladas => lista vazia)
 */

import { ExtensionLoader, type LoadedExtension } from './extension-loader';

export class ExtensionHost {
	private loader: ExtensionLoader;
	private extensionPaths: string[];

	constructor(input?: { extensionPaths?: string[] }) {
		this.loader = new ExtensionLoader();
		this.extensionPaths = Array.isArray(input?.extensionPaths) ? input!.extensionPaths! : [];
	}

	setExtensionPaths(paths: string[]): void {
		this.extensionPaths = Array.isArray(paths) ? paths : [];
	}

	async loadExtensions(): Promise<LoadedExtension[]> {
		const paths = this.extensionPaths;
		if (!paths.length) return this.loader.getAllExtensions();

		for (const p of paths) {
			await this.loader.loadExtension(p);
		}

		return this.loader.getAllExtensions();
	}

	getExtensions(): LoadedExtension[] {
		return this.loader.getAllExtensions();
	}

	getActiveExtensions(): LoadedExtension[] {
		return this.loader.getActiveExtensions();
	}

	async deactivateAll(): Promise<void> {
		const all = this.loader.getAllExtensions();
		for (const ext of all) {
			if (ext.isActive) {
				await this.loader.deactivateExtension(ext.id);
			}
		}
	}
}

let extensionHostInstance: ExtensionHost | null = null;

export function getExtensionHost(): ExtensionHost {
	if (!extensionHostInstance) {
		extensionHostInstance = new ExtensionHost();
	}
	return extensionHostInstance;
}

export function resetExtensionHost(): void {
	extensionHostInstance = null;
}
