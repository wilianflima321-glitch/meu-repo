'use client'

import React from 'react'
import AdminPanel from '../../AdminPanel'

interface AdminTabProps {
  // Props para o AdminPanel se necessário
}

export default function AdminTab({}: AdminTabProps) {
  return (
    <div className="aethel-p-6 aethel-space-y-8">
      <div className="aethel-text-center">
        <h2 className="aethel-text-2xl aethel-font-bold">Painel de Administração</h2>
        <p className="aethel-text-slate-400">Gerencie usuários, faturamento, permissões e configurações do sistema</p>
      </div>

      <div className="aethel-card aethel-p-6">
        <AdminPanel />
      </div>

      <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 aethel-gap-6">
        <div className="aethel-card aethel-p-6">
          <h3 className="aethel-text-lg aethel-font-bold aethel-mb-4">Estatísticas do Sistema</h3>
          <div className="aethel-space-y-4">
            <div className="aethel-flex aethel-justify-between aethel-items-center">
              <span className="aethel-text-sm aethel-text-slate-400">Usuários Ativos</span>
              <span className="aethel-text-sm aethel-font-bold">1,234</span>
            </div>
            <div className="aethel-flex aethel-justify-between aethel-items-center">
              <span className="aethel-text-sm aethel-text-slate-400">Novas Contas (Hoje)</span>
              <span className="aethel-text-sm aethel-font-bold">42</span>
            </div>
            <div className="aethel-flex aethel-justify-between aethel-items-center">
              <span className="aethel-text-sm aethel-text-slate-400">Total de Projetos</span>
              <span className="aethel-text-sm aethel-font-bold">5,678</span>
            </div>
            <div className="aethel-flex aethel-justify-between aethel-items-center">
              <span className="aethel-text-sm aethel-text-slate-400">Geração de Tokens (Mensal)</span>
              <span className="aethel-text-sm aethel-font-bold">4.2M</span>
            </div>
          </div>
        </div>

        <div className="aethel-card aethel-p-6">
          <h3 className="aethel-text-lg aethel-font-bold aethel-mb-4">Alertas de Segurança</h3>
          <div className="aethel-space-y-3">
            <div className="aethel-flex aethel-items-center aethel-gap-3 aethel-p-2 aethel-bg-red-500/10 aethel-rounded-lg">
              <div className="aethel-w-2 aethel-h-2 aethel-bg-red-500 aethel-rounded-full"></div>
              <span className="aethel-text-xs aethel-text-red-400">3 Tentativas de login suspeitas detectadas</span>
            </div>
            <div className="aethel-flex aethel-items-center aethel-gap-3 aethel-p-2 aethel-bg-yellow-500/10 aethel-rounded-lg">
              <div className="aethel-w-2 aethel-h-2 aethel-bg-yellow-500 aethel-rounded-full"></div>
              <span className="aethel-text-xs aethel-text-yellow-400">Certificado SSL expira em 15 dias</span>
            </div>
            <div className="aethel-flex aethel-items-center aethel-gap-3 aethel-p-2 aethel-bg-blue-500/10 aethel-rounded-lg">
              <div className="aethel-w-2 aethel-h-2 aethel-bg-blue-500 aethel-rounded-full"></div>
              <span className="aethel-text-xs aethel-text-blue-400">Backup semanal concluído com sucesso</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
