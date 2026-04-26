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
    id: 'deploy_123',
    url: 'https://deploy.example.com',
    inspectorUrl: 'https://vercel.example.com/deploy_123',
    status: 'building',
    createdAt: '2026-04-26T03:00:00.000Z',
    ...overrides,
  };
}

describe('mergePreviewDeployRecord', () => {
  it('preserves the last ready deploy when a new deploy is still building', () => {
    const previous = buildDeployment({
      status: 'ready',
      readyAt: '2026-04-26T02:50:00.000Z',
      lastReadyUrl: 'https://deploy-old.example.com',
      lastReadyInspectorUrl: 'https://vercel.example.com/old',
      lastReadyAt: '2026-04-26T02:50:00.000Z',
    });

    const merged = mergePreviewDeployRecord(
      previous,
      buildDeployment({
        id: 'deploy_456',
        url: '',
        inspectorUrl: 'https://vercel.example.com/deploy_456',
        status: 'building',
      })
    );

    expect(merged.lastReadyUrl).toBe('https://deploy-old.example.com');
    expect(merged.lastReadyInspectorUrl).toBe('https://vercel.example.com/old');
    expect(merged.status).toBe('building');
  });

  it('refreshes the stable share target when a deploy becomes ready', () => {
    const merged = mergePreviewDeployRecord(
      buildDeployment({
        status: 'ready',
        url: 'https://deploy-old.example.com',
        readyAt: '2026-04-26T02:50:00.000Z',
      }),
      buildDeployment({
        id: 'deploy_789',
        status: 'ready',
        url: 'https://deploy-new.example.com',
        inspectorUrl: 'https://vercel.example.com/deploy_789',
        readyAt: '2026-04-26T03:10:00.000Z',
      })
    );

    expect(merged.lastReadyUrl).toBe('https://deploy-new.example.com');
    expect(merged.lastReadyInspectorUrl).toBe('https://vercel.example.com/deploy_789');
    expect(merged.lastReadyAt).toBe('2026-04-26T03:10:00.000Z');
  });
});

describe('resolveShareHref', () => {
  it('prefers the most recent ready public deploy', () => {
    const target = resolveShareHref({
      deployment: buildDeployment({
        status: 'ready',
        url: 'https://deploy-ready.example.com',
      }),
      previewRuntimeUrl: 'http://localhost:3000',
    });

    expect(target).toEqual({
      href: 'https://deploy-ready.example.com',
      label: 'Public deploy',
    });
  });

  it('falls back to the last ready public deploy before using runtime preview', () => {
    const target = resolveShareHref({
      deployment: buildDeployment({
        status: 'building',
        url: '',
        lastReadyUrl: 'https://deploy-stable.example.com',
      }),
      previewRuntimeUrl: 'http://localhost:3000',
    });

    expect(target).toEqual({
      href: 'https://deploy-stable.example.com',
      label: 'Last public deploy',
    });
  });
});
