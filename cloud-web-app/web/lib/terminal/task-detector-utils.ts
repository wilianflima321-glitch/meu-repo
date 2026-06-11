export function getTaskAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('aethel-token');
  } catch {
    return null;
  }
}

export function normalizeTaskPath(path: string): string {
  if (!path) return '/';
  const p = path.startsWith('/') ? path : `/${path}`;
  return p.replace(/\\/g, '/');
}

export async function readTaskWorkspaceFile(path: string): Promise<string> {
  const token = getTaskAuthToken();
  const url = `/api/files/read?path=${encodeURIComponent(normalizeTaskPath(path))}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw Object.assign(new Error(text || `HTTP ${res.status}`), { status: res.status, path });
  }

  const data = (await res.json().catch(() => null)) as { content?: unknown } | null;
  if (!data || typeof data.content !== 'string') {
    throw Object.assign(new Error('Invalid file read response.'), { status: 502, path });
  }

  return data.content;
}
