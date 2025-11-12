"use client"
import useSWR from 'swr'
import { API_BASE } from '@/lib/api'
const API = API_BASE
const fetcher = (u:string)=>fetch(u).then(r=>r.json())
export default function Billing(){
  const { data } = useSWR(`${API}/billing/plans`, fetcher)
  return (
    <div className="grid">
      {(data||[]).map((p:any)=> (
        <div className="aethel-card" key={p.key}>
          <h3>{p.key.toUpperCase()}</h3>
          <p><b>${'{'}p.price_usd{'}'}/mês</b> — Créditos: { '${'}p.monthly_credits_usd{'}' }</p>
          <button className="aethel-button aethel-button-primary" onClick={()=>alert('Checkout em breve')}>Assinar</button>
        </div>
      ))}
    </div>
  )
}
