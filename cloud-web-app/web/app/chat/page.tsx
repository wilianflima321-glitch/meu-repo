"use client"
import { useEffect, useMemo, useState } from 'react'
import { authHeaders } from '@/lib/auth'
import { postChat } from '@/lib/ai'
import { useToast } from '@/components/ui/Toast'

const FALLBACK_MODELS = ['gpt-4o-mini', 'gemini-1.5-flash', 'gemini-1.5-pro', 'claude-3-5-haiku-20241022']

type Msg = { role: 'user' | 'assistant'; content: string; traceId?: string }

type UsageStatusResponse = {
  data?: {
    plan?: string
    limits?: {
      maxAgents?: number
      maxTokensPerRequest?: number
    }
    features?: string[]
    models?: string[]
  }
}

type AdvancedChatResponse = {
  message?: { role: string; content: string }
  content?: string
  traceId?: string
}

function TraceDetailsPanel(props: { traceId: string; trace: any }) {
  const trace = props.trace

  const summary = typeof trace?.summary === 'string' ? trace.summary : ''
  const decision = typeof trace?.decisionRecord?.decision === 'string' ? trace.decisionRecord.decision : ''
  const reasons = Array.isArray(trace?.decisionRecord?.reasons) ? trace.decisionRecord.reasons : []
  const tradeoffs = Array.isArray(trace?.decisionRecord?.tradeoffs) ? trace.decisionRecord.tradeoffs : []

  const evidence = Array.isArray(trace?.evidence) ? trace.evidence : []
  const toolRuns = Array.isArray(trace?.toolRuns) ? trace.toolRuns : []
  const riskChecks = Array.isArray(trace?.riskChecks) ? trace.riskChecks : []
  const telemetry = trace?.telemetry && typeof trace.telemetry === 'object' ? trace.telemetry : null

  return (
    <div style={{ background: 'rgba(0,0,0,0.22)', padding: 10, borderRadius: 6, marginTop: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>
        <b>Trace</b>: {props.traceId}
      </div>

      {summary ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}><b>Resumo</b></div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{summary}</div>
        </div>
      ) : null}

      {decision ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}><b>Decisão</b></div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{decision}</div>
          {reasons.length > 0 ? (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}><b>Motivos</b></div>
              <ul style={{ margin: '6px 0 0 18px' }}>
                {reasons.slice(0, 10).map((r: any, idx: number) => (
                  <li key={idx} style={{ whiteSpace: 'pre-wrap' }}>{String(r)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {tradeoffs.length > 0 ? (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}><b>Tradeoffs</b></div>
              <ul style={{ margin: '6px 0 0 18px' }}>
                {tradeoffs.slice(0, 10).map((t: any, idx: number) => (
                  <li key={idx} style={{ whiteSpace: 'pre-wrap' }}>{String(t)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {evidence.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}><b>Evidências</b></div>
          <ul style={{ margin: '6px 0 0 18px' }}>
            {evidence.slice(0, 25).map((e: any, idx: number) => (
              <li key={idx}>
                <span style={{ opacity: 0.85 }}>{String(e?.kind || 'other')}:</span> {String(e?.label || '')}
                {e?.detail ? <div style={{ opacity: 0.9, whiteSpace: 'pre-wrap' }}>{String(e.detail)}</div> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {riskChecks.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}><b>Riscos</b></div>
          <ul style={{ margin: '6px 0 0 18px' }}>
            {riskChecks.slice(0, 15).map((r: any, idx: number) => (
              <li key={idx}>
                <span style={{ opacity: 0.85 }}>{String(r?.status || 'warn')}:</span> {String(r?.risk || '')}
                {r?.mitigation ? <div style={{ opacity: 0.9, whiteSpace: 'pre-wrap' }}>{String(r.mitigation)}</div> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {toolRuns.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}><b>Ferramentas</b></div>
          <ul style={{ margin: '6px 0 0 18px' }}>
            {toolRuns.slice(0, 25).map((t: any, idx: number) => (
              <li key={idx}>
                <span style={{ opacity: 0.85 }}>{String(t?.status || 'ok')}:</span> {String(t?.toolName || '')}
                {typeof t?.durationMs === 'number' ? <span style={{ opacity: 0.8 }}> ({t.durationMs}ms)</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {telemetry ? (
        <div>
          <div style={{ fontSize: 12, opacity: 0.85 }}><b>Telemetria</b></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6, fontSize: 13 }}>
            {telemetry.model ? <div><span style={{ opacity: 0.8 }}>model</span>: {String(telemetry.model)}</div> : null}
            {telemetry.provider ? <div><span style={{ opacity: 0.8 }}>provider</span>: {String(telemetry.provider)}</div> : null}
            {typeof telemetry.estimatedTokens === 'number' ? <div><span style={{ opacity: 0.8 }}>est</span>: {telemetry.estimatedTokens}</div> : null}
            {typeof telemetry.tokensUsed === 'number' ? <div><span style={{ opacity: 0.8 }}>used</span>: {telemetry.tokensUsed}</div> : null}
            {typeof telemetry.latencyMs === 'number' ? <div><span style={{ opacity: 0.8 }}>lat</span>: {telemetry.latencyMs}ms</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function ChatPage(){
  const toast = useToast()
  const [history, setHistory] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [availableModels, setAvailableModels] = useState<string[]>(FALLBACK_MODELS)
  const [model, setModel] = useState(FALLBACK_MODELS[0])
  const [features, setFeatures] = useState<string[]>([])
  const [maxAgents, setMaxAgents] = useState<number>(1)

  const [agentCount, setAgentCount] = useState<1 | 2 | 3>(1)
  const [roleModels, setRoleModels] = useState<{ architect: string; engineer: string; critic: string }>({
    architect: FALLBACK_MODELS[0],
    engineer: FALLBACK_MODELS[0],
    critic: FALLBACK_MODELS[0],
  })

  const [runtime, setRuntime] = useState<'proxy' | 'advanced'>('proxy')
  const [includeTrace, setIncludeTrace] = useState(false)
  const [traceById, setTraceById] = useState<Record<string, any>>({})
  const [expandedTraceIds, setExpandedTraceIds] = useState<Record<string, boolean>>({})

  const modelOptions = useMemo(() => {
    const list = Array.isArray(availableModels) && availableModels.length > 0 ? availableModels : FALLBACK_MODELS
    // Evita expor "*" como opção direta no select.
    const normalized = list.filter((m) => typeof m === 'string' && m.trim() && m.trim() !== '*')
    return normalized.length > 0 ? normalized : FALLBACK_MODELS
  }, [availableModels])

  useEffect(() => {
    // Fonte de verdade: /api/usage/status (já usa plan-limits.ts)
    // Fallback: lista hardcoded, para não quebrar quando não estiver logado.
    const run = async () => {
      try {
        const res = await fetch('/api/usage/status', {
          method: 'GET',
          headers: {
            ...(authHeaders() as Record<string, string>),
          },
        })
        if (!res.ok) return
        const json: UsageStatusResponse = await res.json().catch(() => ({} as any))
        const serverModels = json?.data?.models
        const serverFeatures = json?.data?.features
        const serverMaxAgents = json?.data?.limits?.maxAgents
        if (Array.isArray(serverModels) && serverModels.length > 0) {
          setAvailableModels(serverModels)
          setModel((current) => (serverModels.includes(current) ? current : (serverModels[0] as string)))
        }

        if (Array.isArray(serverFeatures)) {
          setFeatures(serverFeatures)
        }

        if (typeof serverMaxAgents === 'number' && Number.isFinite(serverMaxAgents)) {
          setMaxAgents(Math.max(1, Math.floor(serverMaxAgents)))
        }
      } catch {
        // Ignorar: fallback permanece
      }
    }
    run()
  }, [])

  const canUseAgents = useMemo(() => {
    // Enforce do backend já existe; aqui é só UX e prevenção de duplicidade.
    return features.includes('*') || features.includes('agents') || maxAgents > 1
  }, [features, maxAgents])

  useEffect(() => {
    // Mantém roleModels alinhado com modelos válidos.
    // Se o usuário ainda não escolheu nada (ou estava em fallback inválido), acompanha o modelo principal.
    setRoleModels((s) => {
      const valid = new Set(modelOptions)
      const normalize = (v: string) => (typeof v === 'string' ? v : '')
      const current = {
        architect: normalize(s.architect),
        engineer: normalize(s.engineer),
        critic: normalize(s.critic),
      }

      const next = { ...current }
      if (!next.architect || !valid.has(next.architect)) next.architect = model
      if (!next.engineer || !valid.has(next.engineer)) next.engineer = model
      if (!next.critic || !valid.has(next.critic)) next.critic = model
      return next
    })
  }, [model, modelOptions])

  useEffect(() => {
    // UX: se o plano não suporta 2/3 agentes, força 1.
    if (!canUseAgents && agentCount !== 1) setAgentCount(1)
    if (agentCount > maxAgents) setAgentCount(1)
  }, [agentCount, canUseAgents, maxAgents])
  const send = async () => {
    if(!input.trim()) return
    const next = [...history, {role:'user',content:input}]
    setHistory(next as Msg[])
    setInput('')
    try {
      const typed = next.map(m => ({ role: m.role as ('user'|'assistant'), content: m.content }))

      if (runtime === 'proxy') {
        const data = await postChat({ model, messages: typed }, { headers: authHeaders() as Record<string,string> })
        const content = (data && (data as any).content) || (data && (data as any).message && (data as any).message.content) || ''
        setHistory(h=>[...h,{role:'assistant',content}])
        return
      }

      // Runtime avançado (rota interna): suporta agentId e traceId.
      const res = await fetch('/api/ai/chat-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders() as Record<string,string>),
        },
        body: JSON.stringify({
          model,
          messages: typed,
          stream: false,
          includeTrace,
          agentCount: runtime === 'advanced' ? agentCount : 1,
          roleModels: agentCount > 1 ? roleModels : undefined,
        }),
      })
      const json: AdvancedChatResponse = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        const msg = (json as any)?.message || (json as any)?.error || `HTTP ${res.status}`
        throw new Error(String(msg))
      }

      const content = json?.content || json?.message?.content || ''
      setHistory(h=>[...h,{role:'assistant',content, traceId: json?.traceId}])
      return
    } catch (e:any) {
      const txt = e?.message || 'Erro desconhecido'
      toast.error(`Falha no chat (precisa estar logado e com créditos): ${txt}`)
      return
    }
  }

  const toggleDetails = async (traceId: string) => {
    setExpandedTraceIds((s) => ({ ...s, [traceId]: !s[traceId] }))
    if (traceById[traceId]) return

    try {
      const res = await fetch(`/api/ai/trace/${encodeURIComponent(traceId)}`, {
        method: 'GET',
        headers: {
          ...(authHeaders() as Record<string,string>),
        },
      })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.trace) {
        setTraceById((s) => ({ ...s, [traceId]: json.trace }))
      }
    } catch {
      // ignore
    }
  }
  return (
    <div className="aethel-card">
      <h2>Chat</h2>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <select className="aethel-input" value={runtime} onChange={e=>setRuntime(e.target.value as any)}>
          <option value="proxy">Proxy (/api/ai/chat)</option>
          <option value="advanced">Avançado (/api/ai/chat-advanced)</option>
        </select>

        {runtime === 'advanced' ? (
          <select
            className="aethel-input"
            value={agentCount}
            onChange={(e) => setAgentCount(Number(e.target.value) as 1 | 2 | 3)}
            title={!canUseAgents ? 'Multi-agente não disponível no seu plano' : `Máx: ${maxAgents}`}
          >
            <option value={1}>1 agente</option>
            <option value={2} disabled={!canUseAgents || maxAgents < 2}>2 agentes</option>
            <option value={3} disabled={!canUseAgents || maxAgents < 3}>3 agentes</option>
          </select>
        ) : null}

        {runtime !== 'advanced' || agentCount === 1 ? (
          <select className="aethel-input" value={model} onChange={e=>setModel(e.target.value)}>
            {modelOptions.map(m=> <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <>
            <select className="aethel-input" value={roleModels.architect} onChange={e=>setRoleModels((s)=>({ ...s, architect: e.target.value }))}>
              {modelOptions.map(m=> <option key={`arch:${m}`} value={m}>Arquiteto: {m}</option>)}
            </select>
            <select className="aethel-input" value={roleModels.engineer} onChange={e=>setRoleModels((s)=>({ ...s, engineer: e.target.value }))}>
              {modelOptions.map(m=> <option key={`eng:${m}`} value={m}>Engenheiro: {m}</option>)}
            </select>
            {agentCount === 3 ? (
              <select className="aethel-input" value={roleModels.critic} onChange={e=>setRoleModels((s)=>({ ...s, critic: e.target.value }))}>
                {modelOptions.map(m=> <option key={`crit:${m}`} value={m}>Crítico: {m}</option>)}
              </select>
            ) : null}
          </>
        )}

        <label style={{display:'flex',alignItems:'center',gap:6}}>
          <input type="checkbox" checked={includeTrace} onChange={(e)=>setIncludeTrace(e.target.checked)} disabled={runtime !== 'advanced'} />
          Ver detalhes
        </label>
        <button className="aethel-button aethel-button-secondary" onClick={()=>toast.info('Live / Canvas em breve')}>Live/Canvas</button>
      </div>
      <div style={{minHeight:200,background:'#0b1325',padding:12,borderRadius:8,marginBottom:8}}>
        {history.map((m,i)=> (
          <div key={i} style={{marginBottom:8}}>
            <div>
              <b>{m.role==='user'?'Você':'Aethel'}:</b> {m.content}
              {m.role === 'assistant' && m.traceId ? (
                <button
                  className="aethel-button aethel-button-secondary"
                  style={{marginLeft:8, padding:'2px 8px'}}
                  onClick={() => toggleDetails(m.traceId as string)}
                >
                  Detalhes
                </button>
              ) : null}
            </div>
            {m.role === 'assistant' && m.traceId && expandedTraceIds[m.traceId] ? (
              traceById[m.traceId] ? (
                <TraceDetailsPanel traceId={m.traceId} trace={traceById[m.traceId]} />
              ) : (
                <div style={{ background: 'rgba(0,0,0,0.22)', padding: 10, borderRadius: 6, marginTop: 6, opacity: 0.9 }}>
                  Carregando detalhes…
                </div>
              )
            ) : null}
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:8}}>
        <input className="aethel-input" value={input} onChange={e=>setInput(e.target.value)} placeholder="Digite sua mensagem..." />
        <button className="aethel-button aethel-button-primary" onClick={send}>Enviar</button>
      </div>
    </div>
  )
}
