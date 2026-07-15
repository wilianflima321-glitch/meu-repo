import { describe, expect, it } from 'vitest';

import {
  mergePreviewDeployRecord,
  resolveReviewTarget,
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

describe('resolveReviewTarget', () => {
  it('marks a ready public deploy as review-ready', () => {
    const target = resolveReviewTarget({
      deployment: buildDeployment({
        status: 'ready',
        url: 'https://deploy-ready.example.com',
      }),
      previewRuntimeUrl: 'http://localhost:3000',
      runtimeHealthStatus: 'reachable',
      runtimeReadinessStatus: 'ready',
    });

    expect(target).toMatchObject({
      kind: 'review_ready_public',
      href: 'https://deploy-ready.example.com',
      actionLabel: 'Copy review link',
    });
  });

  it('promotes a reachable ready runtime into an internal review target', () => {
    const target = resolveReviewTarget({
      deployment: null,
      previewRuntimeUrl: 'http://localhost:3000',
      runtimeHealthStatus: 'reachable',
      runtimeReadinessStatus: 'ready',
    });

    expect(target).toMatchObject({
      kind: 'review_ready_runtime',
      href: 'http://localhost:3000',
      actionLabel: 'Copy review link',
    });
  });

  it('keeps a stale public deploy available when current publish is blocked', () => {
    const target = resolveReviewTarget({
      deployment: buildDeployment({
        status: 'building',
        url: '',
        lastReadyUrl: 'https://deploy-stable.example.com',
      }),
      previewRuntimeUrl: 'http://localhost:3000',
      runtimeHealthStatus: 'unreachable',
      runtimeReadinessStatus: 'partial',
      deployReadiness: {
        canDeploy: false,
        qaGate: {
          ok: false,
          blockers: ['tests', 'bundle'],
          durationMs: 1250,
        },
      },
    });

    expect(target).toMatchObject({
      kind: 'blocked_stale',
      href: 'https://deploy-stable.example.com',
      actionLabel: 'Copy last public link',
    });
  });

  it('marks preview-only runtime as ephemeral before review promotion', () => {
    const target = resolveReviewTarget({
      deployment: null,
      previewRuntimeUrl: 'http://localhost:3000',
      runtimeHealthStatus: 'checking',
      runtimeReadinessStatus: 'partial',
    });

    expect(target).toMatchObject({
      kind: 'ephemeral_runtime',
      href: 'http://localhost:3000',
      actionLabel: 'Copy preview link',
    });
  });
});
