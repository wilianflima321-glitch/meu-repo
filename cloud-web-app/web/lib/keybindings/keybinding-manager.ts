/**
 * Keybinding Manager (adapter)
 *
 * ide-integration.ts usa uma API estilo VS Code (registerKeybinding).
 * Internamente mapeamos para o KeyboardManager, que executa ações no browser.
 */

import { getKeyboardManager } from '../keyboard/keyboard-manager';

export type Keybinding = {
	id: string;
	key: string;
	command: string;
	when?: string;
};

export class KeybindingManager {
	private keyboard = getKeyboardManager();
	private registered: Map<string, Keybinding> = new Map();

	registerKeybinding(binding: Keybinding): void {
		this.registered.set(binding.id, binding);

		// Mapeamento simples: Ctrl/Alt/Shift/Meta + tecla
		const parsed = parseKey(binding.key);
		this.keyboard.register({
			key: parsed.key,
			ctrl: parsed.ctrl,
			alt: parsed.alt,
			shift: parsed.shift,
			meta: parsed.meta,
			action: () => {
				// Dispara um evento que a UI pode capturar.
				if (typeof window !== 'undefined') {
					window.dispatchEvent(new CustomEvent('aethel:command', { detail: { command: binding.command } }));
				}
			},
			description: binding.command,
			category: 'Keybindings',
		});
	}

	getAllKeybindings(): Keybinding[] {
		return Array.from(this.registered.values());
	}
}

function parseKey(input: string): { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean } {
	// Exemplos esperados: "Ctrl+S", "Ctrl+K S", "Ctrl+Shift+G"
	const normalized = input.replace(/\s+/g, ' ').trim();
	const parts = normalized.split(/\+|\s+/).map(p => p.trim().toLowerCase()).filter(Boolean);
	const flags = {
		ctrl: parts.includes('ctrl') || parts.includes('control'),
		alt: parts.includes('alt') || parts.includes('option'),
		shift: parts.includes('shift'),
		meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command') || parts.includes('win'),
	};

	// última parte que não é modificador vira key
	const key = [...parts].reverse().find(p => !['ctrl', 'control', 'alt', 'option', 'shift', 'meta', 'cmd', 'command', 'win'].includes(p)) || '';
	return { key, ...flags };
}

let keybindingManagerInstance: KeybindingManager | null = null;

export function getKeybindingManager(): KeybindingManager {
	if (!keybindingManagerInstance) {
		keybindingManagerInstance = new KeybindingManager();
	}
	return keybindingManagerInstance;
}

export function resetKeybindingManager(): void {
	keybindingManagerInstance = null;
}
