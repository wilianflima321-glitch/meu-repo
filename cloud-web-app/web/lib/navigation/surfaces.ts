export type NavigationLink = {
  href: string
  label: string
  exact?: boolean
}

export const PUBLIC_NAV_LINKS: NavigationLink[] = [
  { href: '/pricing', label: 'Plans' },
  { href: '/compare', label: 'Compare' },
  { href: '/docs', label: 'Docs' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/trust', label: 'Trust' },
  { href: '/customers', label: 'Customers' },
  { href: '/status', label: 'Status' },
  { href: '/contact-sales', label: 'Contact' },
]

export const STUDIO_PRIMARY_LINKS: NavigationLink[] = [
  { href: '/dashboard', label: 'Mission', exact: true },
  { href: '/ide', label: 'Studio', exact: true },
  { href: '/studio', label: 'Creative', exact: false },
  { href: '/nexus', label: 'Operator', exact: true },
]

export const STUDIO_SECONDARY_LINKS: NavigationLink[] = [
  { href: '/billing', label: 'Billing', exact: false },
  { href: '/settings', label: 'Settings', exact: false },
  { href: '/status', label: 'Status', exact: false },
  { href: '/profile', label: 'Profile', exact: false },
]

export function isNavLinkActive(pathname: string, link: NavigationLink): boolean {
  if (link.exact) return pathname === link.href
  if (pathname === link.href) return true
  return pathname.startsWith(`${link.href}/`)
}
