const eventBus = new Map<string, Set<(data: unknown) => void>>();

export function emitEvent(event: string, data: unknown): void {
    eventBus.get(event)?.forEach(cb => cb(data));
}

export function onEvent(event: string, callback: (data: unknown) => void): () => void {
    if (!eventBus.has(event)) {
        eventBus.set(event, new Set());
    }
    eventBus.get(event)!.add(callback);
    return () => eventBus.get(event)?.delete(callback);
}
