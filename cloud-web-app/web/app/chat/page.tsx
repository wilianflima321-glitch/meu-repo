"use client"
import { useState } from 'react'
import { authHeaders } from '@/lib/auth'
import { postChat } from '@/lib/ai'

const MODELOS = ['openai:gpt-4o-mini','gemini-1.5-pro','anthropic:claude-3-5-sonnet-20240620','manus:default']

type Msg = { role: 'user' | 'assistant'; content: string }

export default function ChatPage(){
  const [history, setHistory] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState(MODELOS[0])
  const send = async () => {
    if(!input.trim()) return
    const next = [...history, {role:'user',content:input}]
    setHistory(next as Msg[])
    setInput('')
    try {
  const typed = next.map(m => ({ role: m.role as ('user'|'assistant'), content: m.content }))
  const data = await postChat({ model, messages: typed }, { headers: authHeaders() as Record<string,string> })
      const content = (data && (data as any).content) || (data && (data as any).message && (data as any).message.content) || ''
      setHistory(h=>[...h,{role:'assistant',content}])
      return
    } catch (e:any) {
      const txt = e?.message || 'Erro desconhecido'
      alert(`Falha no chat (precisa estar logado e com créditos)\n${txt}`)
      return
    }
  }
  return (
    <div className="aethel-card">
      <h2>Chat</h2>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <select className="aethel-input" value={model} onChange={e=>setModel(e.target.value)}>
          {MODELOS.map(m=> <option key={m} value={m}>{m}</option>)}
        </select>
        <button className="aethel-button aethel-button-secondary" onClick={()=>alert('Live / Canvas em breve')}>Live/Canvas</button>
      </div>
      <div style={{minHeight:200,background:'#0b1325',padding:12,borderRadius:8,marginBottom:8}}>
        {history.map((m,i)=> <div key={i}><b>{m.role==='user'?'Você':'Aethel'}:</b> {m.content}</div>)}
      </div>
      <div style={{display:'flex',gap:8}}>
        <input className="aethel-input" value={input} onChange={e=>setInput(e.target.value)} placeholder="Digite sua mensagem..." />
        <button className="aethel-button aethel-button-primary" onClick={send}>Enviar</button>
      </div>
    </div>
  )
}
