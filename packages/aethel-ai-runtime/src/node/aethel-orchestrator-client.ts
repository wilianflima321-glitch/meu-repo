import fetch from 'node-fetch';

const ORCHESTRATOR_BASE = process.env.AETHEL_ORCHESTRATOR_URL || 'http://localhost:8000/orchestrator';
const ADMIN_TOKEN = process.env.AI_RUNTIME_ADMIN_TOKEN;

function headers() {
    const h: any = { 'Content-Type': 'application/json' };
    if (ADMIN_TOKEN) h['X-Admin-Token'] = ADMIN_TOKEN;
    return h;
}

export async function submitTask(taskType: string, payload: any) {
    const resp = await fetch(`${ORCHESTRATOR_BASE}/submit`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ task_type: taskType, payload })
    });
    if (!resp.ok) throw new Error(`submitTask failed: ${resp.status}`);
    return resp.json();
}

export async function getStatus(taskId: string) {
    const resp = await fetch(`${ORCHESTRATOR_BASE}/status/${taskId}`, { headers: headers() });
    if (!resp.ok) throw new Error(`getStatus failed: ${resp.status}`);
    return resp.json();
}
