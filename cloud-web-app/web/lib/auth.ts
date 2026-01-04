/**
 * Auth helpers (Client)
 * Mantém token do usuário no browser para chamadas à API.
 *
 * Observação: lógica de JWT/requireAuth para rotas do Next está em lib/auth-server.ts.
 */

const TOKEN_STORAGE_KEY = 'aethel-token';

function canUseLocalStorage(): boolean {
	return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function saveToken(value: unknown): void {
	if (!canUseLocalStorage()) return;

	let token: string | null = null;
	if (typeof value === 'string') {
		token = value;
	} else if (value && typeof value === 'object') {
		const v = value as any;
		if (typeof v.access_token === 'string') token = v.access_token;
		else if (typeof v.token === 'string') token = v.token;
		else if (typeof v.accessToken === 'string') token = v.accessToken;
	}

	if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function getToken(): string | null {
	if (!canUseLocalStorage()) return null;
	return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearToken(): void {
	if (!canUseLocalStorage()) return;
	localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function isAuthenticated(): boolean {
	return !!getToken();
}

export function authHeaders(): Record<string, string> {
	const token = getToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}
