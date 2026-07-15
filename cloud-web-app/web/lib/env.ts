export function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw Object.assign(new Error(`ENV_NOT_SET: defina ${name}`), {
			code: 'ENV_NOT_SET',
			env: name,
		});
	}
	return value;
}

export function optionalEnv(name: string): string | undefined {
	return process.env[name] || undefined;
}
