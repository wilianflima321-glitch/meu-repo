import { History } from 'lucide-react'
import DocsResourcePage from '@/app/docs/docs-resource-page'

const CARDS = [
  {
    eyebrow: 'Shipped lately',
    title: 'Workbench e shell mais honestos',
    description:
      'Terminal virou superficie canonica, breadcrumbs com symbol truth entraram no editor, e a status bar agora reflete git, cursor, diagnosticos e runtime em vez de filler.',
    links: [
      { label: 'Ver docs do IDE', href: '/docs/ide' },
      { label: 'Ver status operacional', href: '/status' },
    ],
  },
  {
    eyebrow: 'Shipped lately',
    title: 'Preview, deploy e review mais fortes',
    description:
      'Preview trust, deploy status e melhor link de share agora falam a mesma lingua entre toolbar, topbar e pagina de deploy.',
    links: [
      { label: 'Abrir pricing', href: '/pricing' },
      { label: 'Abrir status', href: '/status' },
    ],
  },
  {
    eyebrow: 'Still open',
    title: 'Paridade total de prerender',
    description:
      'O caminho compile-mode segue como mitigacao valida de producao, enquanto o antigo probe de prerender continua aberto e tratado com honestidade nas auditorias.',
    links: [
      { label: 'Ler docs de suporte', href: '/docs/support' },
      { label: 'Repositorio no GitHub', href: 'https://github.com/wilianflima321-glitch/meu-repo', external: true },
    ],
  },
]

export default function ChangelogPage() {
  return (
    <DocsResourcePage
      eyebrow="Changelog publico"
      title="Mudancas recentes do studio sem maquiagem"
      description="Esta pagina resume deltas visiveis do produto e o que ainda esta aberto, para que a leitura publica acompanhe a mesma honestidade das auditorias internas."
      icon={History}
      accentClassName="text-[var(--aethel-primary-light)]"
      summary="O objetivo aqui nao e listar todo commit, e sim deixar claro o que melhorou para usuarios finais e o que ainda continua em maturidade parcial."
      cards={CARDS}
      calloutTitle="Onde acompanhar a trilha completa"
      calloutDescription="Para a visao mais detalhada, combine esta pagina com a documentacao publica, a status page e o repositorio. Isso mantem a narrativa comercial alinhada com a realidade operacional."
      calloutLinks={[
        { label: 'Documentacao oficial', href: '/docs' },
        { label: 'Status operacional', href: '/status' },
        { label: 'Repositorio publico', href: 'https://github.com/wilianflima321-glitch/meu-repo', external: true },
      ]}
    />
  )
}
