
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type UpgradeStatus = 'planned' | 'partial' | 'missing' | 'applied';

interface Upgrade {
  id: string;
  name: string;
  status: UpgradeStatus;
  description?: string | null;
  applied: boolean;
}

const statusLabels: Record<UpgradeStatus, string> = {
  applied: 'Aplicado',
  partial: 'Parcial',
  missing: 'Faltando',
  planned: 'Planejado',
};

const statusColors: Record<UpgradeStatus, string> = {
  applied: 'bg-green-100 text-green-800 border-green-400',
  partial: 'bg-yellow-100 text-yellow-800 border-yellow-400',
  missing: 'bg-red-100 text-red-800 border-red-400',
  planned: 'bg-blue-100 text-blue-800 border-blue-400',
};

export default function AIUpgrades() {
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchUpgrades = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ai/enhancements');
      if (!res.ok) throw new Error('Falha ao carregar melhorias');
      const json = await res.json();
      setUpgrades(json.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar melhorias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpgrades();
  }, [fetchUpgrades]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return upgrades.filter((u) => !term || u.name.toLowerCase().includes(term) || (u.description || '').toLowerCase().includes(term));
  }, [upgrades, search]);

  const applyUpgrade = async (upgrade: Upgrade) => {
    try {
      const res = await fetch('/api/admin/ai/enhancements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: upgrade.id, applied: !upgrade.applied, status: upgrade.applied ? upgrade.status : 'applied' }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar melhoria');
      await fetchUpgrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar melhoria');
    }
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Melhorias para IA Aethel</h1>
      <p className='mb-4 text-gray-600'>Matriz de maturidade: capacidades atuais, lacunas e melhorias priorizadas com governança.</p>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>O que Aethel Já Tem (Pontos Fortes)</h2>
        <ul className='list-disc ml-5 space-y-2'>
          <li><strong>Integração IDE:</strong> Foco em desenvolvimento, fine-tuning personalizado.</li>
          <li><strong>Agentes e Detecção de Viés:</strong> Modo agent básico, correção ética.</li>
          <li><strong>Eficiência:</strong> Treinamento otimizado, custo-eficiente.</li>
          <li><strong>Modularidade:</strong> Seguro, sem conflitos, escalável.</li>
        </ul>
      </div>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Lacunas Identificadas (Benchmark interno)</h2>
        <ul className='list-disc ml-5 space-y-2'>
          <li><strong>Raciocínio:</strong> Robustez variável em contextos complexos; requer validação e revisão humana.</li>
          <li><strong>Multimodal:</strong> Cobertura parcial de imagem/áudio/vídeo; precisa de pipeline consistente.</li>
          <li><strong>Criatividade:</strong> Forte em engenharia, limitada para arte e narrativa sem curadoria.</li>
          <li><strong>Processamento:</strong> Arquivos grandes e streaming precisam de otimização de memória e I/O.</li>
          <li><strong>Programação:</strong> Alta performance, porém ainda há gaps em domínios específicos e otimização fina.</li>
          <li><strong>Modo Agent:</strong> Colaboração e planejamento multi‑agente em evolução.</li>
          <li><strong>Ética e Filtros:</strong> Detecção boa, mas faltam dashboards visuais e regras dinâmicas avançadas.</li>
        </ul>
      </div>

      <div className='mb-6'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-semibold'>Melhorias Propostas</h2>
          <input
            className='border p-2 rounded text-sm'
            placeholder='Buscar melhoria'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {error && (
          <div className='bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4'>
            {error}
          </div>
        )}
        {loading ? (
          <p className='text-sm text-gray-500'>Carregando melhorias...</p>
        ) : filtered.length === 0 ? (
          <p className='text-sm text-gray-500'>Nenhuma melhoria encontrada.</p>
        ) : (
          <div className='space-y-4'>
            {filtered.map((upgrade) => (
              <div key={upgrade.id} className='p-4 bg-slate-800 rounded-lg shadow-md border-l-4'>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className='text-lg font-semibold text-slate-100'>{upgrade.name}</h3>
                    <p className={`text-sm font-medium px-2 py-0.5 rounded-full inline-block ${statusColors[upgrade.status]}`}>
                      Status: {statusLabels[upgrade.status]}
                    </p>
                    <p className="mt-2 text-slate-400">{upgrade.description || 'Sem descrição'}</p>
                  </div>
                  <button
                    onClick={() => applyUpgrade(upgrade)}
                    className={`mt-2 px-4 py-2 rounded-md font-semibold transition-colors ${upgrade.applied ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                  >
                    {upgrade.applied ? 'Reverter' : 'Aplicar melhoria'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='p-4 bg-purple-100 rounded-lg'>
        <h3 className='font-semibold'>Diretrizes de Evolução:</h3>
        <ul className='list-disc ml-5'>
          <li>Priorize confiabilidade com validação, métricas e aprovação por ambiente.</li>
          <li>Expanda multimodal com curadoria e limites de custo/qualidade.</li>
          <li>Eleve o modo agente com planejamento, execução auditável e rollback.</li>
          <li>Reforce segurança, compliance e observabilidade em todas as rotas.</li>
        </ul>
      </div>
    </div>
  );
}
