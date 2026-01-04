"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-env jest */
const ensemble_provider_1 = require("./ensemble-provider");
class FakeProvider {
    constructor(id, body, delayMs = 0) {
        this.type = 'custom';
        this.id = id;
        this.name = id;
        this.body = body;
        this.delayMs = delayMs;
    }
    async sendRequest(_options) {
        // keep the parameter present for signature compatibility but mark as used
        void _options;
        if (this.delayMs > 0) {
            await new Promise(r => setTimeout(r, this.delayMs));
        }
        return { status: 200, body: this.body };
    }
}
describe('EnsembleProvider', () => {
    test('fast mode returns first successful provider', async () => {
        const p1 = new FakeProvider('p1', { text: 'first' }, 10);
        const p2 = new FakeProvider('p2', { text: 'second' }, 5);
        const factory = (id) => (id === 'p1' ? p1 : id === 'p2' ? p2 : undefined);
        const cfg = { providerIds: ['p1', 'p2'], mode: 'fast', timeoutMs: 1000 };
        const e = new ensemble_provider_1.EnsembleProvider(cfg, factory);
        const resp = await e.sendRequest({ input: 'hi' });
        expect(resp.status).toBe(200);
        expect(resp.body).toEqual({ text: 'first' });
    });
    test('blend mode concatenates texts', async () => {
        const p1 = new FakeProvider('p1', { text: 'one' }, 1);
        const p2 = new FakeProvider('p2', { text: 'two' }, 1);
        const factory = (id) => (id === 'p1' ? p1 : id === 'p2' ? p2 : undefined);
        const cfg = { providerIds: ['p1', 'p2'], mode: 'blend', timeoutMs: 1000 };
        const e = new ensemble_provider_1.EnsembleProvider(cfg, factory);
        const resp = await e.sendRequest({ input: 'blend' });
        expect(resp.status).toBe(207);
        expect(resp.body.blended).toBe(true);
        expect(typeof resp.body.text).toBe('string');
        expect(resp.body.text).toContain('one');
        expect(resp.body.text).toContain('two');
    });
    test('best mode picks the longest text', async () => {
        const p1 = new FakeProvider('p1', { text: 'short' }, 1);
        const p2 = new FakeProvider('p2', { text: 'this is a longer answer' }, 1);
        const factory = (id) => (id === 'p1' ? p1 : id === 'p2' ? p2 : undefined);
        const cfg = { providerIds: ['p1', 'p2'], mode: 'best', timeoutMs: 1000 };
        const e = new ensemble_provider_1.EnsembleProvider(cfg, factory);
        const resp = await e.sendRequest({ input: 'best' });
        expect(resp.status).toBe(200);
        // should be the second provider's body
        expect(resp.body).toEqual({ text: 'this is a longer answer' });
    });
    test('timeout causes fallback and other providers can succeed', async () => {
        const p1 = new FakeProvider('p1', { text: 'slow' }, 500);
        const p2 = new FakeProvider('p2', { text: 'fast' }, 1);
        const factory = (id) => (id === 'p1' ? p1 : id === 'p2' ? p2 : undefined);
        const cfg = { providerIds: ['p1', 'p2'], mode: 'fast', timeoutMs: 50 };
        const e = new ensemble_provider_1.EnsembleProvider(cfg, factory);
        const resp = await e.sendRequest({ input: 'timeout test' });
        // p1 will timeout; p2 should succeed and be returned
        expect(resp.status).toBe(200);
        expect(resp.body).toEqual({ text: 'fast' });
    });
});
