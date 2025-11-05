import { EnsembleProvider, EnsembleCfg } from './ensemble-provider';
import { ILlmProvider, SendRequestOptions, LlmProviderResponse } from '../../common/llm-provider';

class FakeProvider implements ILlmProvider {
  id: string;
  name: string;
  type: any = 'custom';
  body: any;
  delayMs: number;
  constructor(id: string, body: any, delayMs = 0) {
    this.id = id;
    this.name = id;
    this.body = body;
    this.delayMs = delayMs;
  }
  async sendRequest(_options: SendRequestOptions): Promise<LlmProviderResponse> {
    if (this.delayMs > 0) {await new Promise(r => setTimeout(r, this.delayMs));}
    return { status: 200, body: this.body };
  }
}

describe('EnsembleProvider', () => {
  test('fast mode returns first successful provider', async () => {
    const p1 = new FakeProvider('p1', { text: 'first' }, 10);
    const p2 = new FakeProvider('p2', { text: 'second' }, 5);
    const factory = (id: string) => (id === 'p1' ? p1 : id === 'p2' ? p2 : undefined);
    const cfg: EnsembleCfg = { providerIds: ['p1', 'p2'], mode: 'fast', timeoutMs: 1000 };
    const e = new EnsembleProvider(cfg, factory);
    const resp = await e.sendRequest({ input: 'hi' });
  expect(resp.status).toBe(200);
  expect((resp.body as any)).toEqual({ text: 'first' });
  });

  test('blend mode concatenates texts', async () => {
    const p1 = new FakeProvider('p1', { text: 'one' }, 1);
    const p2 = new FakeProvider('p2', { text: 'two' }, 1);
    const factory = (id: string) => (id === 'p1' ? p1 : id === 'p2' ? p2 : undefined);
    const cfg: EnsembleCfg = { providerIds: ['p1', 'p2'], mode: 'blend', timeoutMs: 1000 };
    const e = new EnsembleProvider(cfg, factory);
    const resp = await e.sendRequest({ input: 'blend' });
  expect(resp.status).toBe(207);
  expect((resp.body as any).blended).toBe(true);
  expect(typeof (resp.body as any).text).toBe('string');
  expect((resp.body as any).text).toContain('one');
  expect((resp.body as any).text).toContain('two');
  });

  test('best mode picks the longest text', async () => {
    const p1 = new FakeProvider('p1', { text: 'short' }, 1);
    const p2 = new FakeProvider('p2', { text: 'this is a longer answer' }, 1);
    const factory = (id: string) => (id === 'p1' ? p1 : id === 'p2' ? p2 : undefined);
    const cfg: EnsembleCfg = { providerIds: ['p1', 'p2'], mode: 'best', timeoutMs: 1000 };
    const e = new EnsembleProvider(cfg, factory);
    const resp = await e.sendRequest({ input: 'best' });
  expect(resp.status).toBe(200);
  // should be the second provider's body
  expect((resp.body as any)).toEqual({ text: 'this is a longer answer' });
  });

  test('timeout causes fallback and other providers can succeed', async () => {
    const p1 = new FakeProvider('p1', { text: 'slow' }, 500);
    const p2 = new FakeProvider('p2', { text: 'fast' }, 1);
    const factory = (id: string) => (id === 'p1' ? p1 : id === 'p2' ? p2 : undefined);
    const cfg: EnsembleCfg = { providerIds: ['p1', 'p2'], mode: 'fast', timeoutMs: 50 };
    const e = new EnsembleProvider(cfg, factory);
    const resp = await e.sendRequest({ input: 'timeout test' });
  // p1 will timeout; p2 should succeed and be returned
  expect(resp.status).toBe(200);
  expect((resp.body as any)).toEqual({ text: 'fast' });
  });
});
