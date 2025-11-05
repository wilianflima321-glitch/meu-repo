import fetch from 'node-fetch';

const AI_RUNTIME_BASE = process.env.AI_RUNTIME_URL || 'http://localhost:8000/ai-runtime';
const ADMIN_TOKEN = process.env.AI_RUNTIME_ADMIN_TOKEN;

function makeHeaders(additional?: Record<string, string>) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (ADMIN_TOKEN) {
        // forward as X-Admin-Token for compatibility with backend allowlist
        headers['X-Admin-Token'] = ADMIN_TOKEN;
    }
    if (additional) {
        for (const k of Object.keys(additional)) {
            headers[k] = additional[k];
        }
    }
    return headers;
}

export async function loadModelShim(modelName: string, type: string) {
    const url = `${AI_RUNTIME_BASE}/load_model`;
    const body = { model_name: modelName, model_type: type };
    const resp = await fetch(url, {
        method: 'POST',
        headers: makeHeaders(),
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`loadModel failed: ${resp.status} ${txt}`);
    }
    return resp.json();
}

export async function runInferenceShim(model: string, prompt: string, max_tokens = 256) {
    const url = `${AI_RUNTIME_BASE}/run_inference`;
    const body = { model: model, prompt: prompt, max_tokens: max_tokens };
    const resp = await fetch(url, {
        method: 'POST',
        headers: makeHeaders(),
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`runInference failed: ${resp.status} ${txt}`);
    }
    return resp.json();
}
