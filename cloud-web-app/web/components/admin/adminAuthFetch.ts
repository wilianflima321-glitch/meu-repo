'use client';

import { getToken } from '@/lib/auth';

export async function adminJsonFetch<T = unknown>(url: string): Promise<T> {
  const token = getToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      (payload && (payload.message || payload.error)) || `Request failed (${response.status})`,
    );
  }
  return payload as T;
}
