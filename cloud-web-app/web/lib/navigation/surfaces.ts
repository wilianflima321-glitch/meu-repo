export type NavigationLink = {
  href: string
  label: string
  exact?: boolean
}

export const PUBLIC_NAV_LINKS: NavigationLink[] = [
  { href: '/pricing', label: 'Planos' },
  { href: '/compare', label: 'Compare' },
  { href: '/docs', label: 'Documentacao' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/security', label: 'Seguranca' },
  { href: '/customers', label: 'Clientes' },
  { href: '/status', label: 'Status' },
  { href: '/contact-sales', label: 'Contato' },
]

export const STUDIO_PRIMARY_LINKS: NavigationLink[] = [
  { href: '/dashboard', label: 'Inicio', exact: true },
  { href: '/ide', label: 'IDE', exact: true },
  { href: '/nexus', label: 'Nexus', exact: true },
  { href: '/billing', label: 'Faturamento', exact: false },
  { href: '/settings', label: 'Configuracoes', exact: false },
]

export const STUDIO_SECONDARY_LINKS: NavigationLink[] = [
  { href: '/profile', label: 'Perfil', exact: false },
  { href: '/status', label: 'Status', exact: false },
]

export function isNavLinkActive(pathname: string, link: NavigationLink): boolean {
  if (link.exact) return pathname === link.href
  if (pathname === link.href) return true
  return pathname.startsWith(`${link.href}/`)
}
