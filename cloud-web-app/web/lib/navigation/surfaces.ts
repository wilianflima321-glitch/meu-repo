export type NavigationLink = {
  href: string
  label: string
  exact?: boolean
}

export const PUBLIC_NAV_LINKS: NavigationLink[] = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
  { href: '/status', label: 'Status' },
  { href: '/contact-sales', label: 'Contato' },
]

export const STUDIO_PRIMARY_LINKS: NavigationLink[] = [
  { href: '/dashboard', label: 'Home', exact: true },
  { href: '/ide', label: 'IDE', exact: true },
  { href: '/nexus', label: 'Nexus', exact: true },
  { href: '/billing', label: 'Billing', exact: false },
  { href: '/settings', label: 'Settings', exact: false },
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
