'use client';

import { useState } from 'react';

type UpgradeStatus = 'Parcial' | 'Faltando' | 'Novo' | 'Aplicado';

interface Upgrade {
  name: string;
  initialStatus: UpgradeStatus;
  status: UpgradeStatus;
  description: string;
  applied: boolean;
}

const initialUpgrades: Upgrade[] = [
  { name: 'Inteligência Geral Superior', initialStatus: 'Parcial', status: 'Parcial', description: 'Raciocínio avançado, ética perfeita.', applied: false },
  { name: 'Multimodal Avançado', initialStatus: 'Faltando', status: 'Faltando', description: 'Processar texto, imagem, vídeo, áudio sem limites.', applied: false },
  { name: 'Criatividade Extrema', initialStatus: 'Parcial', status: 'Parcial', description: 'Gerar apps, jogos, filmes de alta qualidade.', applied: false },
  { name: 'Processamento de Grandes Arquivos', initialStatus: 'Faltando', status: 'Faltando', description: 'Ver e analisar arquivos grandes sem truncar.', applied: false },
  { name: 'Programação Mestre', initialStatus: 'Parcial', status: 'Parcial', description: 'Melhor em todas linguagens, otimização, debugging.', applied: false },
  { name: 'Modo Agent Superior', initialStatus: 'Parcial', status: 'Parcial', description: 'Planejamento estratégico, colaboração, adaptação em tempo real.', applied: false },
  { name: 'Filtros e Mapas', initialStatus: 'Novo', status: 'Novo', description: 'Gerar mapas visuais com filtros para dados complexos.', applied: false },
];

const statusColors: Record<UpgradeStatus, string> = {
  'Aplicado': 'bg-green-100 text-green-800 border-green-400',
  'Parcial': 'bg-yellow-100 text-yellow-800 border-yellow-400',
  'Faltando': 'bg-red-100 text-red-800 border-red-400',
  'Novo': 'bg-blue-100 text-blue-800 border-blue-400',
};

export default function AIUpgrades() {
  const [upgrades, setUpgrades] = useState<Upgrade[]>(initialUpgrades);

  const applyUpgrade = (index: number) => {
    setUpgrades((ups) =>
      ups.map((u, i) => {
        if (i !== index) return u;
        const applied = !u.applied;
        return {
          ...u,
          applied,
          status: applied ? 'Aplicado' : u.initialStatus,
        };
      })
    );
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Upgrades para IA Aethel - Superar Concorrentes</h1>
      <p className='mb-4 text-gray-600'>O que ela já tem, lacunas e melhorias para ser a melhor IA do mundo, mais inteligente que GPT-5, Llama 4, Manus.</p>

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
        <h2 className='text-xl font-semibold mb-4'>Lacunas Identificadas (Comparado a GPT-5, Manus)</h2>
        <ul className='list-disc ml-5 space-y-2'>
          <li><strong>Inteligência Geral:</strong> Raciocínio limitado em contextos complexos; alucinações raras, mas possíveis.</li>
          <li><strong>Multimodal:</strong> Focado em texto; falta visão/avançada para vídeo/áudio.</li>
          <li><strong>Criatividade:</strong> Boa em código, mas limitada em arte/filmes/apps interativos.</li>
          <li><strong>Processamento:</strong> Arquivos grandes truncados; sem streaming eficiente.</li>
          <li><strong>Programação:</strong> Forte, mas não mestre em todas linguagens/otimizações.</li>
          <li><strong>Modo Agent:</strong> Básico; falta planejamento estratégico, colaboração multi-agente.</li>
          <li><strong>Ética e Filtros:</strong> Detecção ok, mas sem mapas visuais ou filtros dinâmicos.</li>
        </ul>
      </div>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Melhorias Propostas para Superar Tudo</h2>
        <div className='space-y-4'>
          {upgrades.map((upgrade, index) => (
            <div key={upgrade.name} className='p-4 bg-slate-800 rounded-lg shadow-md border-l-4'>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className='text-lg font-semibold text-slate-100'>{upgrade.name}</h3>
                  <p className={`text-sm font-medium px-2 py-0.5 rounded-full inline-block ${statusColors[upgrade.status]}`}>
                    Status: {upgrade.status}
                  </p>
                  <p className="mt-2 text-slate-400">{upgrade.description}</p>
                </div>
                <button
                  onClick={() => applyUpgrade(index)}
                  className={`mt-2 px-4 py-2 rounded-md font-semibold transition-colors ${upgrade.applied ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                >
                  {upgrade.applied ? 'Reverter' : 'Aplicar Upgrade'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='p-4 bg-purple-100 rounded-lg'>
        <h3 className='font-semibold'>Como Superar Concorrentes:</h3>
        <ul className='list-disc ml-5'>
          <li>Integre reasoning avançado (como GPT-5) com ética perfeita e multimodal full-stack.</li>
          <li>Use aprendizado contínuo para evitar catástrofes; adicione mapas/filtros para visualização.</li>
          <li>Torne programação mestre via fine-tuning em todas linguagens; modo agent com IA auxiliar para planejamento.</li>
          <li>Gere conteúdo (apps/jogos/filmes) com qualidade hollywoodiana via multimodal.</li>
        </ul>
      </div>
    </div>
  );
}
