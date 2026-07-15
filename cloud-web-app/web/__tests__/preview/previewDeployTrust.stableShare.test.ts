import { describe, expect, it } from 'vitest';

import {
  mergePreviewDeployRecord,
  resolveShareHref,
  type PreviewDeployRecord,
} from '@/components/preview/previewDeployTrust';

function buildDeployment(
  overrides: Partial<PreviewDeployRecord> = {}
): PreviewDeployRecord {
  return {
    id: 'deploy_current',
    url: 'https://deploy-current.example.com',
    inspectorUrl: 'https://vercel.example.com/deploy_current',
    status: 'building',
    createdAt: '2026-04-26T03:00:00.000Z',
    ...overrides,
  };
}

describe('preview deploy stable share links', () => {
  it('keeps the last ready public deploy share target when a later refresh fails', () => {
    const previous = buildDeployment({
      id: 'deploy_ready',
      status: 'ready',
      url: 'https://deploy-stable.example.com',
      inspectorUrl: 'https://vercel.example.com/deploy_ready',
      readyAt: '2026-04-26T02:55:00.000Z',
      lastReadyUrl: 'https://deploy-stable.example.com',
      lastReadyInspectorUrl: 'https://vercel.example.com/deploy_ready',
      lastReadyAt: '2026-04-26T02:55:00.000Z',
    });

    const merged = mergePreviewDeployRecord(
      previous,
      buildDeployment({
        id: 'deploy_failed_refresh',
        status: 'error',
        url: '',
        inspectorUrl: 'https://vercel.example.com/deploy_failed_refresh',
        error: 'Timeout from provider',
      })
    );

    expect(resolveShareHref({
      deployment: merged,
      previewRuntimeUrl: 'http://localhost:3000',
    })).toEqual({
      href: 'https://deploy-stable.example.com',
      label: 'Last public deploy',
    });
  });

  it('does not fall back to the runtime preview when a ready record lacks a public URL', () => {
    const previous = buildDeployment({
      id: 'deploy_ready',
      status: 'ready',
      url: 'https://deploy-stable.example.com',
      inspectorUrl: 'https://vercel.example.com/deploy_ready',
      readyAt: '2026-04-26T02:55:00.000Z',
      lastReadyUrl: 'https://deploy-stable.example.com',
      lastReadyInspectorUrl: 'https://vercel.example.com/deploy_ready',
      lastReadyAt: '2026-04-26T02:55:00.000Z',
    });

    const merged = mergePreviewDeployRecord(
      previous,
      buildDeployment({
        id: 'deploy_missing_public_url',
        status: 'ready',
        url: '',
        inspectorUrl: '',
      })
    );

    expect(merged.lastReadyUrl).toBe('https://deploy-stable.example.com');
    expect(resolveShareHref({
      deployment: merged,
      previewRuntimeUrl: 'http://localhost:3000',
    })).toEqual({
      href: 'https://deploy-stable.example.com',
      label: 'Last public deploy',
    });
  });
});
