import * as React from 'react';
import { BaseWidget, WidgetManager } from '@theia/core/lib/browser';
import { injectable, inject } from '@theia/core/shared/inversify';
import { LlmProviderRegistry } from '../../browser/llm-provider-registry';
import { MessageService } from '@theia/core';

export const ProviderConfigurationWidgetID = 'ai-llm-provider-configuration-widget';

interface State {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  providers: any[];
  selected?: string;
  billingMode?: 'platform' | 'self' | 'sponsored';
  pricePerToken?: number;
  currency?: string;
  ownerId?: string;
  // ensemble specific
  type?: string;
  providerIds?: string; // comma-separated list in UI
  mode?: 'fast' | 'blend' | 'best';
  timeoutMs?: number;
  constraints?: string; // comma-separated constraints for ensemble
}

@injectable()
export class ProviderConfigurationWidget extends BaseWidget {
  static ID = ProviderConfigurationWidgetID;

  @inject(WidgetManager)
  protected readonly widgetManager!: WidgetManager;

  @inject(LlmProviderRegistry)
  protected readonly registry!: LlmProviderRegistry;

  @inject(MessageService)
  protected readonly messageService!: MessageService;

  protected state: State = { id: '', name: '', endpoint: '', apiKey: '', providers: [] };

  constructor() {
    super();
    this.id = ProviderConfigurationWidget.ID;
    this.title.label = 'LLM Providers';
  }

  protected async init(): Promise<void> {
    // load providers from registry
    try {
      const all = this.registry.getAll();
      this.state.providers = all;
      this.update();
    } catch (e) {
      // ignore
    }
  }

    protected render(): React.ReactNode {
    return (
      <div className='p-2 provider-config-root'>
        <div className='provider-config-columns'>
          <div className='provider-config-column'>
            <h3>Configured providers</h3>
            <ul>
              {this.state.providers.map(p => (
                <li key={p.id} className='provider-item'>
                  <strong>{p.name || p.id}</strong> <small>({p.endpoint || 'no endpoint'})</small>
                  <div>
                    <button onClick={() => this.selectProvider(p.id)}>Edit</button>
                    <button onClick={() => this.deleteProvider(p.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className='provider-config-column'>
            <h3>{this.state.selected ? 'Edit provider' : 'New provider'}</h3>
            <div>
              <label>Id</label>
              <input value={this.state.id} onChange={e => { this.state.id = (e.target as HTMLInputElement).value; this.update(); }} />
            </div>
            <div>
              <label>Name</label>
              <input value={this.state.name} onChange={e => { this.state.name = (e.target as HTMLInputElement).value; this.update(); }} />
            </div>
            <div>
              <label>Endpoint</label>
              <input value={this.state.endpoint} onChange={e => { this.state.endpoint = (e.target as HTMLInputElement).value; this.update(); }} />
            </div>
            <div>
              <label>API Key</label>
              <input type='password' value={this.state.apiKey} onChange={e => { this.state.apiKey = (e.target as HTMLInputElement).value; this.update(); }} />
            </div>
            <div>
              <label>Type</label>
              <select value={this.state.type ?? 'custom'} onChange={e => { this.state.type = (e.target as HTMLSelectElement).value; this.update(); }}>
                <option value='custom'>Custom HTTP</option>
                <option value='ensemble'>Ensemble (multi-provider)</option>
              </select>
            </div>
            {this.state.type === 'ensemble' && (
              <>
                <div>
                  <label>Member provider IDs (comma separated)</label>
                  <input value={this.state.providerIds ?? ''} onChange={e => { this.state.providerIds = (e.target as HTMLInputElement).value; this.update(); }} />
                </div>
                <div>
                  <label>Ensemble mode</label>
                  <select value={this.state.mode ?? 'fast'} onChange={e => { this.state.mode = (e.target as HTMLSelectElement).value as any; this.update(); }}>
                    <option value='fast'>Fast (first good)</option>
                    <option value='blend'>Blend (concatenate)</option>
                    <option value='best'>Best (heuristic)</option>
                  </select>
                </div>
                <div>
                  <label>Timeout (ms)</label>
                  <input type='number' value={this.state.timeoutMs ?? 2500} onChange={e => { this.state.timeoutMs = parseInt((e.target as HTMLInputElement).value) || 2500; this.update(); }} />
                </div>
                <div>
                  <label>Constraints (comma separated, e.g. no_weapons,no_smoke)</label>
                  <input value={this.state.constraints ?? ''} onChange={e => { this.state.constraints = (e.target as HTMLInputElement).value; this.update(); }} />
                </div>
              </>
            )}
            <div>
              <label>Billing mode</label>
              <select value={this.state.billingMode ?? 'self'} onChange={e => { this.state.billingMode = (e.target as HTMLSelectElement).value as any; this.update(); }}>
                <option value='self'>Self (user-owned)</option>
                <option value='platform'>Platform (Aethel billed)</option>
                <option value='sponsored'>Sponsored / Free</option>
              </select>
            </div>
            <div>
              <label>Price per token</label>
              <input type='number' step='0.0000001' value={this.state.pricePerToken ?? ''} onChange={e => { this.state.pricePerToken = parseFloat((e.target as HTMLInputElement).value) || 0; this.update(); }} />
            </div>
            <div>
              <label>Currency</label>
              <input value={this.state.currency ?? 'USD'} onChange={e => { this.state.currency = (e.target as HTMLInputElement).value; this.update(); }} />
            </div>
            <div className='provider-actions'>
              <button onClick={() => this.save()}>Save provider</button>
              <button onClick={() => this.clear()}>Clear</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  protected save() {
    // Enforce non-admin authors to create self-billed providers
    const isAdmin = (typeof window !== 'undefined' && (window as any).__IS_ADMIN) === true;
    const billingMode = isAdmin ? (this.state.billingMode ?? 'self') : 'self';
    const cfg: any = {
      id: this.state.id || `local-${Date.now()}`,
      name: this.state.name || this.state.id,
      endpoint: this.state.endpoint,
      apiKey: this.state.apiKey,
      billingMode,
      rateCard: { pricePerToken: this.state.pricePerToken ?? 0, currency: this.state.currency ?? 'USD' },
      ownerId: isAdmin ? this.state.ownerId ?? undefined : undefined,
      // ensemble fields
      type: this.state.type ?? 'custom'
    };
    if (cfg.type === 'ensemble') {
      const members = (this.state.providerIds || '').split(',').map(s => s.trim()).filter(Boolean);
      (cfg as any).providerIds = members;
      (cfg as any).mode = this.state.mode ?? 'fast';
      (cfg as any).timeoutMs = this.state.timeoutMs ?? 2500;
      const constraints = (this.state.constraints || '').split(',').map(s => s.trim()).filter(Boolean);
      if (constraints.length) (cfg as any).constraints = constraints;
    }
    try {
      this.registry.addProvider(cfg as any);
      // optimistic update to list
      const existing = this.state.providers.filter(p => p.id !== cfg.id);
      const sanitized = { ...cfg, apiKey: undefined };
      // hide secret on UI
      if ('apiKey' in sanitized) delete sanitized.apiKey;
      this.state.providers = [...existing, sanitized];
      this.state.selected = cfg.id;
      // clear apiKey from local state
      this.state.apiKey = '';
      this.messageService.info('Provider saved (backend will be updated if available).');
    } catch (e) {
      this.messageService.error('Failed to save provider');
    }
    this.update();
  }

  protected clear() {
    this.state = { id: '', name: '', endpoint: '', apiKey: '', providers: this.state.providers };
    this.state.selected = undefined;
    this.update();
  }

  protected selectProvider(id: string) {
    const p = this.state.providers.find(x => x.id === id);
    if (!p) return;
    this.state.id = p.id;
    this.state.name = p.name || p.id;
    this.state.endpoint = p.endpoint || '';
    this.state.apiKey = '';
    this.state.selected = id;
    this.update();
  }

  protected deleteProvider(id: string) {
    try {
      this.registry.removeProvider(id);
      this.state.providers = this.state.providers.filter(p => p.id !== id);
      if (this.state.selected === id) this.clear();
      this.messageService.info('Provider delete triggered (backend will be updated if available).');
    } catch (e) {
      this.messageService.error('Failed to delete provider');
    }
    this.update();
  }
}
