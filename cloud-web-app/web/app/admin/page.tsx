"use client"
import Link from 'next/link';
import useSWR from 'swr';
import { API_BASE } from '@/lib/api';
import { getToken } from '@/lib/auth';

const fetcher = (url: string) => fetch(url, {
  headers: { 'Authorization': `Bearer ${getToken()}` }
}).then(r => r.json());

export default function Admin() {
  const { data, error, isLoading } = useSWR(`${API_BASE}/admin/users`, fetcher);
  const planLabels: Record<string, string> = {
    enterprise: 'Empresarial',
    pro: 'Pro',
    free: 'Gratuito',
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Painel de Administração - Aethel IDE</h1>
      <p className='mb-4 text-gray-600'>Gerencie usuários, IA, assinaturas e mais. Tudo seguro e modular.</p>

      {/* User Stats Section */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Usuários Recentes</h2>
        {isLoading ? (
          <p>Carregando usuários...</p>
        ) : error ? (
          <p className="text-red-500">Erro ao carregar usuários. Verifique suas permissões.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Nome</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Plano</th>
                  <th className="p-2">Projetos</th>
                  <th className="p-2">Data de cadastro</th>
                </tr>
              </thead>
              <tbody>
                {data?.users?.map((user: any) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{user.name || 'Sem nome'}</td>
                    <td className="p-2 text-gray-600">{user.email}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                        user.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {planLabels[user.plan] ?? user.plan}
                      </span>
                    </td>
                    <td className="p-2">{user._count.projects}</td>
                    <td className="p-2 text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Links existentes mantidos para brevidade */}
        <Link href='/admin/users' className='block p-4 bg-white rounded-lg shadow hover:shadow-md transition'>
          <h2 className='text-xl font-semibold'>Gerenciar Usuários</h2>
          <p>Visualize e edite perfis, funções e detalhes de usuários.</p>
        </Link>

        {/* ... outros links ... */}

        <Link href='/admin/ai-enhancements' className='block p-4 bg-white rounded-lg shadow hover:shadow-md transition'>
          <h2 className='text-xl font-semibold'>Melhorias avançadas de IA</h2>
          <p>Acesso a IDEs, geração de áudio/música, modo sonho, verificação de arquivos.</p>
        </Link>

        {/* Nova seção para evolução */}
        <Link href='/admin/ai-evolution' className='block p-4 bg-white rounded-lg shadow hover:shadow-md transition'>
          <h2 className='text-xl font-semibold'>Evolução de IA Aethel</h2>
          <p>Auto-evolução, cura, pesquisa APIs, acesso web avançado.</p>
        </Link>

        {/* Novo: Governança/IP Registry */}
        <Link href='/admin/ip-registry' className='block p-4 bg-white rounded-lg shadow hover:shadow-md transition'>
          <h2 className='text-xl font-semibold'>Governança • Registro de IP</h2>
          <p>Defina licenças, IPs permitidos e acione ingestão RAG por IP.</p>
        </Link>
      </div>
    </div>
  );
}
