"use client"
import { useEffect, useState } from 'react'
import { saveToken } from '@/lib/auth'
import { API_BASE } from '@/lib/api'

export default function Login(){
  const [providers, setProviders] = useState<any>({})
  const [email, setEmail] = useState('admin@local')
  const [password, setPassword] = useState('123456')
  const API = API_BASE

  useEffect(() => {
    fetch(`${API}/auth/providers`).then(r=>r.json()).then(setProviders).catch(()=>{})
  },[API])

  const doRegister = async () => {
    const r = await fetch(`${API}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email, password}) })
    if(!r.ok) return alert('Erro registrar')
    const tok = await r.json(); saveToken(tok); alert('Registrado! Token salvo.')
  }
  const doLogin = async () => {
    const r = await fetch(`${API}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email, password}) })
    if(!r.ok) return alert('Erro login')
    const tok = await r.json(); saveToken(tok); alert('Logado! Token salvo.')
  }

  return (
    <div className="aethel-card">
      <h2>Login</h2>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
        {providers.google && <a className="aethel-button aethel-button-secondary" href={`${API}/auth/login/google`}>Google</a>}
        {providers.github && <a className="aethel-button aethel-button-secondary" href={`${API}/auth/login/github`}>GitHub</a>}
      </div>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <input className="aethel-input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
        <input className="aethel-input" value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="senha" />
        <button className="aethel-button aethel-button-primary" onClick={doLogin}>Entrar</button>
        <button className="aethel-button aethel-button-secondary" onClick={doRegister}>Registrar</button>
      </div>
      <hr />
      <form onSubmit={(e)=>{e.preventDefault(); const email=(e.target as any).email.value; fetch(`${API}/auth/magic-link`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})})}}>
        <input name="email" className="aethel-input" placeholder="seu@email" />
        <button className="aethel-button aethel-button-secondary" style={{marginLeft:8}}>Enviar Magic Link</button>
      </form>
    </div>
  )
}
