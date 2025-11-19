import { strict as assert } from 'assert';
import { getBrandingCopy } from '../browser/branding/branding-copy';

describe('AiIdeBrandingWidget localization', () => {
  it('exposes the english copy by default', () => {
    const copy = getBrandingCopy();

    assert.equal(copy.name, 'Aethel IDE');
    assert.equal(copy.tagline, 'Orchestrate providers, agents, and AI tools with confidence');
    assert.equal(copy.quickActions.providers.label, 'Providers');
    assert.equal(copy.quickActions.providers.description, 'Configure LLM providers and credentials');
  });
});
