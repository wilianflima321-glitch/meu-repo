import { getBrandingCopy } from '../browser/branding/branding-copy';

describe('AiIdeBrandingWidget localization', () => {
  it('exposes the english copy by default', () => {
    const copy = getBrandingCopy();

    expect(copy.name).toBe('Aethel IDE');
    expect(copy.tagline).toBe('Orchestrate providers, agents, and AI tools with confidence');
    expect(copy.quickActions.providers.label).toBe('Providers');
    expect(copy.quickActions.providers.description).toBe('Configure LLM providers and credentials');
  });
});
