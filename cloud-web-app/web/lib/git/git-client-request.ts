import type { GitCommit, RawGitBlame, RawGitCommit, RawGitStash } from './git-client.types';

export async function postGitApi<T = unknown>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return response.json() as Promise<T>;
}

export async function postGitApiVoid(endpoint: string, body: Record<string, unknown>): Promise<void> {
  await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function normalizeGitCommits(commits: RawGitCommit[] | undefined): GitCommit[] {
  return (commits ?? []).map((commit) => ({
    ...commit,
    date: new Date(commit.date),
  }));
}

export function normalizeGitBlame(blame: RawGitBlame[] | undefined): Array<Omit<RawGitBlame, 'date'> & { date: Date }> {
  return (blame ?? []).map((entry) => ({
    ...entry,
    date: new Date(entry.date),
  }));
}

export function normalizeGitStashes(stashes: RawGitStash[] | undefined): Array<Omit<RawGitStash, 'date'> & { date: Date }> {
  return (stashes ?? []).map((stash) => ({
    ...stash,
    date: new Date(stash.date),
  }));
}
