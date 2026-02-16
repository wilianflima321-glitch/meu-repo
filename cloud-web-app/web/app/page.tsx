import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default function Page() {
  const token = cookies().get('token')?.value
  if (token) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight">Aethel</h1>
          <p className="mt-3 text-lg text-gray-300">
            Portal profissional: projetos, faturamento, uso/quotas, chat e acesso à IDE.
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-700"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-900"
          >
            Criar conta
          </Link>
          <Link
            href="/terms"
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
          >
            Termos
          </Link>
        </div>

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5">
            <h2 className="text-base font-semibold">Área do usuário</h2>
            <p className="mt-2 text-sm text-gray-300">
              Painel, projetos, histórico, uso/quotas e recursos internos.
            </p>
            <div className="mt-4">
              <Link href="/login" className="text-sm text-sky-400 hover:text-sky-300">
                Entrar para acessar →
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5">
            <h2 className="text-base font-semibold">IDE</h2>
            <p className="mt-2 text-sm text-gray-300">
              A IDE é um produto separado do portal. O portal é o “rosto” e o ponto de entrada.
            </p>
            <div className="mt-4">
              <p className="text-xs text-gray-400">
                (Integração de um clique para abrir a IDE via rota interna é parte do checklist.)
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}