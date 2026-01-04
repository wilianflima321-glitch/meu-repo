require('@testing-library/jest-dom');

// Reduz ruído esperado nos testes sem esconder warnings reais.
// Mantém apenas filtros bem específicos para mensagens conhecidas.
const originalWarn = console.warn;

function shouldSuppressWarn(args) {
	if (!Array.isArray(args) || args.length === 0) return false;

	const [first, second] = args;
	if (typeof first !== 'string') return false;

	// IDEIntegration: em Jest nós propositalmente não temos fetch real.
	if (first.startsWith('[IDE Integration]')) {
		if (first.includes('Already initialized')) return true;

		if (second && typeof second === 'object' && 'message' in second && typeof second.message === 'string') {
			if (second.message.includes('fetch não está configurado no Jest')) return true;
		}

		for (const arg of args) {
			if (typeof arg === 'string' && arg.includes('fetch não está configurado no Jest')) return true;
		}
	}

	return false;
}

console.warn = (...args) => {
	if (process.env.NODE_ENV === 'test' && shouldSuppressWarn(args)) return;
	originalWarn(...args);
};
