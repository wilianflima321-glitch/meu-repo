import Link from 'next/link';

export default function Admin() {
  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Painel de Administração - Aethel IDE</h1>
      <p className='mb-4 text-gray-600'>Gerencie usuários, IA, assinaturas e mais. Tudo seguro e modular.</p>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Links existentes mantidos para brevidade */}
        <Link href='/admin/users' className='block p-4 bg-white rounded-lg shadow hover:shadow-md transition'>
          <h2 className='text-xl font-semibold'>Gerenciar Usuários</h2>
          <p>Visualize e edite perfis, roles e detalhes de usuários normais.</p>
        </Link>

        {/* ... outros links ... */}

        <Link href='/admin/ai-enhancements' className='block p-4 bg-white rounded-lg shadow hover:shadow-md transition'>
          <h2 className='text-xl font-semibold'>Enhancements Avançados de IA</h2>
          <p>Acesso IDEs, geração áudio/música, modo sonhar, verificação arquivos.</p>
        </Link>

        {/* Nova seção para evolução */}
        <Link href='/admin/ai-evolution' className='block p-4 bg-white rounded-lg shadow hover:shadow-md transition'>
          <h2 className='text-xl font-semibold'>Evolução de IA Aethel</h2>
          <p>Auto-evolução, cura, pesquisa APIs, acesso web avançado.</p>
        </Link>

        {/* Novo: Governança/IP Registry */}
        <Link href='/admin/ip-registry' className='block p-4 bg-white rounded-lg shadow hover:shadow-md transition'>
          <h2 className='text-xl font-semibold'>Governança • IP Registry</h2>
          <p>Defina licenças, IPs permitidos e acione ingestão RAG por IP.</p>
        </Link>
      </div>
    </div>
  );
}
