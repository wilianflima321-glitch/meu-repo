'use client';

import { getToken } from '@/lib/auth';

export async function adminJsonFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const token = getToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const mergedHeaders = {
    ...authHeaders,
    ...(init?.headers as Record<string, string> | undefined),
  };
  const response = await fetch(url, {
    ...init,
    headers: Object.keys(mergedHeaders).length > 0 ? mergedHeaders : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      (payload && (payload.message || payload.error)) || `Request failed (${response.status})`,
    );
  }
  return payload as T;
}
