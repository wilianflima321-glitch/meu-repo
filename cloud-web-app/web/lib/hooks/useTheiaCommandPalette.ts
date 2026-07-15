import { useCallback, useEffect, useRef, useState } from 'react';

import { emitEvent } from './useTheiaSystemsEvents';
import { loadCommands } from './useTheiaSystemDefaults';
import type { Command, UseCommandPaletteReturn } from './useTheiaSystemsHooks.types';

export function useCommandPalette(): UseCommandPaletteReturn {
    const [isOpen, setIsOpen] = useState(false);
    const [commands, setCommands] = useState<Command[]>([]);
    const [recentCommands, setRecentCommands] = useState<Command[]>([]);
    const handlersRef = useRef<Map<string, () => void | Promise<void>>>(new Map());

    useEffect(() => {
        loadCommands().then(setCommands);

        const stored = localStorage.getItem('recent-commands');
        if (stored) {
            try {
                setRecentCommands(JSON.parse(stored));
            } catch {
                // Ignore
            }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    const execute = useCallback(async (commandId: string) => {
        const handler = handlersRef.current.get(commandId);
        if (handler) {
            await handler();
        } else {
            emitEvent(`command:${commandId}`, {});
        }

        const command = commands.find(c => c.id === commandId);
        if (command) {
            setRecentCommands(prev => {
                const newRecent = [command, ...prev.filter(c => c.id !== commandId)].slice(0, 10);
                localStorage.setItem('recent-commands', JSON.stringify(newRecent));
                return newRecent;
            });
        }

        close();
    }, [commands, close]);

    const registerCommand = useCallback((command: Command, handler: () => void | Promise<void>): () => void => {
        setCommands(prev => {
            if (prev.find(c => c.id === command.id)) {
                return prev.map(c => c.id === command.id ? command : c);
            }
            return [...prev, command];
        });
        handlersRef.current.set(command.id, handler);

        return () => {
            handlersRef.current.delete(command.id);
            setCommands(prev => prev.filter(c => c.id !== command.id));
        };
    }, []);

    const filter = useCallback((query: string): Command[] => {
        if (!query) return commands;

        const lowerQuery = query.toLowerCase();
        return commands
            .filter(c =>
                c.title.toLowerCase().includes(lowerQuery) ||
                c.category?.toLowerCase().includes(lowerQuery) ||
                c.id.toLowerCase().includes(lowerQuery)
            )
            .sort((a, b) => {
                const aTitle = a.title.toLowerCase().indexOf(lowerQuery);
                const bTitle = b.title.toLowerCase().indexOf(lowerQuery);
                if (aTitle !== -1 && bTitle === -1) return -1;
                if (bTitle !== -1 && aTitle === -1) return 1;
                return aTitle - bTitle;
            });
    }, [commands]);

    return {
        isOpen,
        commands,
        recentCommands,
        open,
        close,
        toggle,
        execute,
        registerCommand,
        filter,
    };
}
