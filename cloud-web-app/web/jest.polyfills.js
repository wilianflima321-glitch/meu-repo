/**
 * Polyfills que precisam rodar ANTES do import dos módulos.
 * (setupFiles roda antes do ambiente e do carregamento de testes)
 */

// Alguns módulos (e o próprio undici) dependem disso no ambiente de teste.
if (!globalThis.TextEncoder || !globalThis.TextDecoder) {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const util = require('util');
	if (!globalThis.TextEncoder) globalThis.TextEncoder = util.TextEncoder;
	if (!globalThis.TextDecoder) globalThis.TextDecoder = util.TextDecoder;
}

// Web Streams API (necessário para undici/fetch em alguns ambientes de teste)
if (!globalThis.ReadableStream || !globalThis.WritableStream || !globalThis.TransformStream) {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const webStreams = require('stream/web');
	if (!globalThis.ReadableStream) globalThis.ReadableStream = webStreams.ReadableStream;
	if (!globalThis.WritableStream) globalThis.WritableStream = webStreams.WritableStream;
	if (!globalThis.TransformStream) globalThis.TransformStream = webStreams.TransformStream;
}

const undici = require('undici');

if (!globalThis.fetch) {
	globalThis.fetch = async () => {
		throw new Error('fetch não está configurado no Jest. Faça mock em cada teste que precisar de rede.');
	};
}
globalThis.Headers = undici.Headers;
globalThis.Request = undici.Request;
globalThis.Response = undici.Response;
