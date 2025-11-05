import { ILlmProvider, SendRequestOptions, LlmProviderResponse } from '../../common/llm-provider';

export class CustomHttpProvider implements ILlmProvider {
  id: string;
  name: string;
  type: 'custom' | 'aethel' = 'custom';
  endpoint?: string;
  apiKey?: string;

  constructor(cfg: any) {
    this.id = cfg.id;
    this.name = cfg.name;
    this.endpoint = cfg.endpoint;
    this.apiKey = cfg.apiKey;
  }

  async sendRequest(options: SendRequestOptions): Promise<LlmProviderResponse> {
    if (!this.endpoint) {throw new Error('Custom provider missing endpoint');}
    const body = { input: options.input, settings: options.settings };
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {headers['Authorization'] = `Bearer ${this.apiKey}`;}
    const resp = await fetch(this.endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await resp.text();
    let parsed: any = text;
    try { parsed = JSON.parse(text); } catch {}
    return { status: resp.status, body: parsed };
  }
}
