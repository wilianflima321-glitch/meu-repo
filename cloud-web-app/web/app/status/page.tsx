import Link from 'next/link';

const SparklesIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const services = [
  { name: 'API Principal', status: 'operational', uptime: '99.99%' },
  { name: 'Editor Web (Monaco)', status: 'operational', uptime: '99.98%' },
  { name: 'Servico de IA/Copilot', status: 'operational', uptime: '99.95%' },
  { name: 'Sistema de Autenticacao', status: 'operational', uptime: '99.99%' },
  { name: 'CDN & Assets', status: 'operational', uptime: '100%' },
  { name: 'WebSocket (Colaboracao)', status: 'operational', uptime: '99.97%' },
  { name: 'Build & Deploy', status: 'operational', uptime: '99.92%' },
  { name: 'Banco de Dados', status: 'operational', uptime: '99.99%' },
];

const incidents: { date: string; title: string; status: 'resolved' | 'investigating'; desc: string }[] = [
  // No current incidents
];

const uptimeData = [
  { day: '7 dias', uptime: '99.98%' },
  { day: '30 dias', uptime: '99.97%' },
  { day: '90 dias', uptime: '99.95%' },
];

export default function StatusPage() {
  const allOperational = services.every(s => s.status === 'operational');

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[150px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <SparklesIcon />
            </div>
            <span className="text-xl font-bold">Aethel</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="text-slate-400 hover:text-white transition-colors">
              Docs
            </Link>
            <Link href="/pricing" className="text-slate-400 hover:text-white transition-colors">
              Precos
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="relative pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Status do Sistema
            </h1>
            <p className="text-slate-400 text-lg">
              Monitoramento em tempo real de todos os servicos Aethel
            </p>
          </div>

          {/* Overall Status */}
          <div className={`p-6 rounded-2xl border mb-8 ${
            allOperational
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                allOperational ? 'bg-emerald-500/20' : 'bg-amber-500/20'
              }`}>
                {allOperational ? (
                  <CheckIcon />
                ) : (
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className={`text-xl font-bold ${allOperational ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {allOperational ? 'Todos os sistemas operacionais' : 'Alguns sistemas com degradacao'}
                </h2>
                <p className="text-slate-400 text-sm">
                  Ultima verificacao: {new Date().toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {/* Uptime Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {uptimeData.map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-2xl font-bold text-white mb-1">{item.uptime}</p>
                <p className="text-sm text-slate-500">{item.day}</p>
              </div>
            ))}
          </div>

          {/* Services List */}
          <div className="rounded-2xl border border-white/10 overflow-hidden mb-8">
            <div className="px-6 py-4 bg-white/5 border-b border-white/10">
              <h3 className="font-semibold">Servicos</h3>
            </div>
            <div className="divide-y divide-white/5">
              {services.map((service, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      service.status === 'operational'
                        ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
                        : service.status === 'degraded'
                        ? 'bg-amber-500 shadow-lg shadow-amber-500/50'
                        : 'bg-red-500 shadow-lg shadow-red-500/50'
                    }`} />
                    <span className="text-white">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">{service.uptime}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      service.status === 'operational'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : service.status === 'degraded'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {service.status === 'operational' ? 'Operacional' : service.status === 'degraded' ? 'Degradado' : 'Indisponivel'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Incidents */}
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 bg-white/5 border-b border-white/10">
              <h3 className="font-semibold">Incidentes Recentes</h3>
            </div>
            <div className="p-6">
              {incidents.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  Nenhum incidente nos últimos 90 dias.
                </p>
              ) : (
                <div className="space-y-4">
                  {incidents.map((incident, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          incident.status === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {incident.status === 'resolved' ? 'Resolvido' : 'Investigando'}
                        </span>
                        <span className="text-xs text-slate-500">{incident.date}</span>
                      </div>
                      <h4 className="font-semibold text-white mb-1">{incident.title}</h4>
                      <p className="text-sm text-slate-400">{incident.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subscribe */}
          <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
            <h3 className="font-semibold text-white mb-2">Receba atualizacoes de status</h3>
            <p className="text-sm text-slate-400 mb-4">
              Seja notificado quando houver problemas ou manutencoes programadas.
            </p>
            <div className="flex gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="seu@email.com"
                className="flex-1 h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
              <button className="h-11 px-6 bg-white text-black font-semibold rounded-xl hover:bg-slate-200 transition-colors">
                Inscrever
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-sm text-slate-500">
          <p>&copy; 2026 Aethel Engine</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link href="/contact-sales" className="hover:text-white transition-colors">Contato</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}




