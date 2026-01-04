"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const context_store_1 = require("../context/context-store");
describe('ContextStore', () => {
    let store;
    const userId = 'test-user';
    const workspaceId = 'ws-1';
    beforeEach(() => {
        store = new context_store_1.ContextStore();
    });
    it('should store and retrieve context', async () => {
        const entry = await store.store({
            workspaceId,
            domain: 'code',
            type: 'conversation',
            content: { data: 'value' },
        });
        const result = await store.get(entry.id, userId);
        (0, chai_1.expect)(result?.content).to.deep.equal({ data: 'value' });
    });
    it('should return undefined for missing ids', async () => {
        const result = await store.get('non-existent', userId);
        (0, chai_1.expect)(result).to.be.undefined;
    });
    it('should delete context', async () => {
        const entry = await store.store({
            workspaceId,
            domain: 'code',
            type: 'conversation',
            content: { data: 'value' },
        });
        await store.delete(entry.id, userId);
        (0, chai_1.expect)(await store.get(entry.id, userId)).to.be.undefined;
    });
    it('should query contexts', async () => {
        await store.store({ workspaceId, domain: 'code', type: 'conversation', content: { a: 1 } });
        await store.store({ workspaceId, domain: 'code', type: 'conversation', content: { b: 2 } });
        const results = await store.query({ workspaceId, domain: 'code' }, userId);
        (0, chai_1.expect)(results.length).to.be.greaterThan(0);
    });
});
