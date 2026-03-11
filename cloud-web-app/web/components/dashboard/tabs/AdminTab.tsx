'use client'

import React from 'react'
import AdminPanel from '../../AdminPanel'

interface AdminTabProps {
  // Props para o AdminPanel se necessário
}

export default function AdminTab({}: AdminTabProps) {
  return (
    <div className="aethel-p-6 space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Painel de Administração</h2>
        <p className="text-slate-400">Gerencie usuários, faturamento, permissões e configurações do sistema</p>
      </div>

      <div className="aethel-card aethel-p-6">
        <AdminPanel />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 aethel-gap-6">
        <div className="aethel-card aethel-p-6">
          <h3 className="text-lg font-bold mb-4">Estatísticas do Sistema</h3>
          <div className="space-y-4">
            <div className="aethel-flex aethel-justify-between aethel-items-center">
              <span className="text-sm text-slate-400">Usuários Ativos</span>
              <span className="text-sm font-bold">1,234</span>
            </div>
            <div className="aethel-flex aethel-justify-between aethel-items-center">
              <span className="text-sm text-slate-400">Novas Contas (Hoje)</span>
              <span className="text-sm font-bold">42</span>
            </div>
            <div className="aethel-flex aethel-justify-between aethel-items-center">
              <span className="text-sm text-slate-400">Total de Projetos</span>
              <span className="text-sm font-bold">5,678</span>
            </div>
            <div className="aethel-flex aethel-justify-between aethel-items-center">
              <span className="text-sm text-slate-400">Geração de Tokens (Mensal)</span>
              <span className="text-sm font-bold">4.2M</span>
            </div>
          </div>
        </div>

        <div className="aethel-card aethel-p-6">
          <h3 className="text-lg font-bold mb-4">Alertas de Segurança</h3>
          <div className="space-y-3">
            <div className="aethel-flex aethel-items-center aethel-gap-3 aethel-p-2 bg-red-500/10 aethel-rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs text-red-400">3 Tentativas de login suspeitas detectadas</span>
            </div>
            <div className="aethel-flex aethel-items-center aethel-gap-3 aethel-p-2 bg-yellow-500/10 aethel-rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-xs text-yellow-400">Certificado SSL expira em 15 dias</span>
            </div>
            <div className="aethel-flex aethel-items-center aethel-gap-3 aethel-p-2 bg-blue-500/10 aethel-rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-blue-400">Backup semanal concluído com sucesso</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
