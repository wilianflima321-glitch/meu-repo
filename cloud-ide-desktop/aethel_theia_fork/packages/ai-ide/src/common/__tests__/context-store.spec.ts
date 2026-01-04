import { expect } from 'chai';
import { ContextStore } from '../context/context-store';

describe('ContextStore', () => {
    let store: ContextStore;
    const userId = 'test-user';
    const workspaceId = 'ws-1';

    beforeEach(() => {
        store = new ContextStore();
    });

    it('should store and retrieve context', async () => {
        const entry = await store.store({
            workspaceId,
            domain: 'code',
            type: 'conversation',
            content: { data: 'value' },
        });
        const result = await store.get(entry.id, userId);
        expect(result?.content).to.deep.equal({ data: 'value' });
    });

    it('should return undefined for missing ids', async () => {
        const result = await store.get('non-existent', userId);
        expect(result).to.be.undefined;
    });

    it('should delete context', async () => {
        const entry = await store.store({
            workspaceId,
            domain: 'code',
            type: 'conversation',
            content: { data: 'value' },
        });
        await store.delete(entry.id, userId);
        expect(await store.get(entry.id, userId)).to.be.undefined;
    });

    it('should query contexts', async () => {
        await store.store({ workspaceId, domain: 'code', type: 'conversation', content: { a: 1 } });
        await store.store({ workspaceId, domain: 'code', type: 'conversation', content: { b: 2 } });
        const results = await store.query({ workspaceId, domain: 'code' }, userId);
        expect(results.length).to.be.greaterThan(0);
    });
});
