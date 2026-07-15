'use client';

import { useEffect, useState } from 'react';

interface QueueItem {
  id: string;
  assetId: string;
  assetName: string;
  assetType: string;
  thumbnailUrl?: string;
  score: number;
  categories: Record<string, number>;
  flaggedAt: string;
  status: 'pending_review' | 'approved' | 'rejected';
  reviewNote?: string;
}

const SCORE_COLOR = (score: number) => {
  if (score >= 0.85) return 'text-red-400';
  if (score >= 0.5) return 'text-yellow-400';
  return 'text-green-400';
};

const CAT_LABEL: Record<string, string> = {
  violence: 'Violence',
  adult_content: 'Adult',
  hate_speech: 'Hate',
  dangerous_content: 'Dangerous',
  copyright: 'Copyright',
};

export default function ModerationQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending_review' | 'approved' | 'rejected'>('pending_review');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/moderation/queue?status=${filter}`);
    const data = await res.json() as { items: QueueItem[] };
    setItems(data.items ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [filter]);

  async function act(itemId: string, action: 'approve' | 'reject') {
    await fetch('/api/admin/moderation/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, action, note }),
    });
    setNoteId(null);
    setNote('');
    void load();
  }

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] p-6 text-[var(--aethel-text-primary)]">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Content Moderation Queue</h1>
        <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
          Review AI-flagged assets before public distribution.
        </p>
      </header>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        {(['pending_review', 'approved', 'rejected'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab
                ? 'bg-[var(--aethel-neon-cyan)]/20 text-[var(--aethel-neon-cyan)] ring-1 ring-[var(--aethel-neon-cyan)]/40'
                : 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            {tab === 'pending_review' ? 'Pending Review' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--aethel-surface-secondary)]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]">
          <p className="text-sm text-[var(--aethel-text-tertiary)]">No items in queue.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map(item => (
            <div
              key={item.id}
              className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-0.5 text-xs text-[var(--aethel-text-tertiary)]">
                      {item.assetType}
                    </span>
                    <span className="truncate text-sm font-semibold text-[var(--aethel-text-primary)]">
                      {item.assetName}
                    </span>
                    <span className={`ml-auto text-sm font-bold ${SCORE_COLOR(item.score)}`}>
                      {(item.score * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(item.categories).map(([cat, score]) => (
                      <span
                        key={cat}
                        className="rounded-full bg-red-900/30 px-2 py-0.5 text-xs text-red-400"
                      >
                        {CAT_LABEL[cat] ?? cat}: {(score * 100).toFixed(0)}%
                      </span>
                    ))}
                  </div>

                  <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
                    Flagged {new Date(item.flaggedAt).toLocaleString()} · Asset: {item.assetId}
                  </p>
                </div>

                {filter === 'pending_review' && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => { setNoteId(item.id); }}
                      className="rounded-lg bg-[var(--aethel-surface-tertiary)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
                    >
                      Add Note
                    </button>
                    <button
                      onClick={() => act(item.id, 'approve')}
                      className="rounded-lg bg-green-600/20 px-3 py-1.5 text-xs font-semibold text-green-400 ring-1 ring-green-600/30 hover:bg-green-600/30"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => act(item.id, 'reject')}
                      className="rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-400 ring-1 ring-red-600/30 hover:bg-red-600/30"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {noteId === item.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-3 py-1.5 text-xs text-[var(--aethel-text-primary)] outline-none focus:border-[var(--aethel-neon-cyan)]/50"
                    placeholder="Optional review note…"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    onKeyDown={e => e.key === 'Escape' && setNoteId(null)}
                  />
                  <button onClick={() => setNoteId(null)} className="text-xs text-[var(--aethel-text-tertiary)]">Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
