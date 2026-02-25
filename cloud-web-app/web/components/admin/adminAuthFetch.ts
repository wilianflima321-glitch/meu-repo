'use client';

import { getToken } from '@/lib/auth';

export async function adminJsonFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const token = getToken();
  const mergedHeaders = new Headers(init?.headers);
  if (token) {
    mergedHeaders.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(url, {
    ...init,
    headers: mergedHeaders,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      (payload && (payload.message || payload.error)) || `Request failed (${response.status})`,
    );
  }
  return payload as T;
}
