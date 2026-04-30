import { describe, expect, it } from 'vitest';

import {
  resolveWorkbenchEntryLane,
  resolveWorkbenchEntryProfile,
} from '../../components/ide/fullscreen/workbench-entry-triage';

describe('workbench entry triage', () => {
  it('routes cloud starters to a runtime-first Studio profile', () => {
    const profile = resolveWorkbenchEntryProfile({
      source: 'home-cloud',
      mission: null,
    });

    expect(resolveWorkbenchEntryLane('home-cloud')).toBe('cloud');
    expect(profile.previewMode).toBe('runtime');
    expect(profile.bottomPanel).toBe('terminal');
    expect(profile.sidebarTab).toBe('git');
    expect(profile.panelState.preview.size).toBeGreaterThanOrEqual(40);
    expect(profile.panelState.chat.open).toBe(true);
  });

  it('routes game starters to a viewport-dominant profile', () => {
    const profile = resolveWorkbenchEntryProfile({
      source: 'home-games',
      mission: null,
    });

    expect(profile.previewMode).toBe('viewport3d');
    expect(profile.dominantSurface).toBe('artifact');
    expect(profile.panelState.preview.size).toBeGreaterThan(profile.panelState.chat.size);
    expect(profile.notice?.title).toMatch(/viewport/i);
  });

  it('turns an explicit mission into an AI-centered Studio handoff even without a domain source', () => {
    const profile = resolveWorkbenchEntryProfile({
      source: null,
      mission: 'Audit the failing deployment and prepare the fix',
    });

    expect(profile.laneId).toBe('general');
    expect(profile.previewMode).toBe('runtime');
    expect(profile.bottomPanel).toBe('chat');
    expect(profile.panelState.chat.open).toBe(true);
    expect(profile.notice?.title).toMatch(/missao/i);
  });
});
