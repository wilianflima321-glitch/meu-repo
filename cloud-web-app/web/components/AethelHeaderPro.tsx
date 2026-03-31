'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  Search,
  Settings,
  LogOut,
  User,
  CreditCard,
  HelpCircle,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  Code,
  Monitor,
  Globe,
} from 'lucide-react'
import { Avatar, PlanBadge, Dropdown, type DropdownItem, Badge } from './ui'
import { isAuthenticated } from '@/lib/auth'

interface UserData {
  name: string
  email: string
  avatar?: string
  plan: 'free' | 'pro' | 'enterprise'
}

export default function AethelHeader() {
  const pathname = usePathname()
  const [isAuth, setIsAuth] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifications, setNotifications] = useState(3)
  
  // Simulated user data - in production, fetch from API
  const [user, setUser] = useState<UserData | null>(null)

  useEffect(() => {
    const auth = isAuthenticated()
    setIsAuth(auth)
    if (auth) {
      // Fetch user data in production
      setUser({
        name: 'Desenvolvedor',
        email: 'dev@aethel.io',
        plan: 'pro',
      })
    }
  }, [])

  const productItems: DropdownItem[] = [
    {
      id: 'ide',
      label: 'IDE Desktop',
      icon: <Monitor className="w-4 h-4" />,
      href: '/download',
    },
    {
      id: 'web',
      label: 'IDE Web',
      icon: <Globe className="w-4 h-4" />,
      href: '/dashboard',
    },
    {
      id: 'ai',
      label: 'AI Assistant',
      icon: <Sparkles className="w-4 h-4" />,
      href: '/chat',
    },
    { id: 'div1', label: '', divider: true },
    {
      id: 'api',
      label: 'API & SDK',
      icon: <Code className="w-4 h-4" />,
      href: '/docs/api',
    },
  ]

  const userMenuItems: DropdownItem[] = [
    {
      id: 'profile',
      label: 'Meu Perfil',
      icon: <User className="w-4 h-4" />,
      href: '/settings/profile',
    },
    {
      id: 'billing',
      label: 'Billing & Plano',
      icon: <CreditCard className="w-4 h-4" />,
      href: '/billing',
    },
    {
      id: 'settings',
      label: 'Configuracoes',
      icon: <Settings className="w-4 h-4" />,
      href: '/settings',
    },
    { id: 'div1', label: '', divider: true },
    {
      id: 'help',
      label: 'Ajuda & Suporte',
      icon: <HelpCircle className="w-4 h-4" />,
      href: '/help',
    },
    { id: 'div2', label: '', divider: true },
    {
      id: 'logout',
      label: 'Sair',
      icon: <LogOut className="w-4 h-4" />,
      onClick: () => {
        localStorage.removeItem('token')
        window.location.href = '/login'
      },
      danger: true,
    },
  ]

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/chat', label: 'AI Chat' },
    { href: '/download', label: 'Download' },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[linear-gradient(180deg,rgba(15,18,26,0.96),rgba(9,11,16,0.98))] backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left Section: Logo + Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/branding/aethel-icon-source.png"
                alt="Aethel"
                width={32}
                height={32}
                sizes="32px"
                className="h-8 w-8 rounded-xl border border-white/10 bg-white/[0.04] p-1 shadow-[0_12px_30px_rgba(56,189,248,0.25)] transition-shadow group-hover:shadow-[0_12px_34px_rgba(99,102,241,0.35)]"
                priority
              />
              <span className="font-bold text-xl text-white">
                Aethel
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Dropdown
                trigger={
                  <span className="flex items-center gap-1.5 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] transition-colors hover:border-[var(--aethel-border-subtle)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] hover:text-[var(--aethel-text-primary)]">
                    Produtos
                    <ChevronDown className="w-4 h-4" />
                  </span>
                }
                items={productItems}
                align="left"
                width="md"
              />

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    rounded-xl px-3 py-2 text-sm font-medium transition-colors
                    ${pathname === link.href
                      ? 'border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] text-[var(--aethel-text-primary)]'
                      : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] hover:text-[var(--aethel-text-primary)]'
                    }
                  `}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Section: Search, Notifications, User */}
          <div className="flex items-center gap-3">
            {/* Global Search */}
            <button
              type="button"
              aria-label="Abrir busca global"
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] px-3 py-1.5 text-sm text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] hover:text-[var(--aethel-text-primary)]"
            >
              <Search className="w-4 h-4" />
              <span>Buscar...</span>
              <kbd className="hidden lg:inline-flex items-center gap-1 rounded-md border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] px-1.5 py-0.5 text-xs text-[var(--aethel-text-quaternary)]">
                Ctrl+K
              </kbd>
            </button>

            {isAuth ? (
              <>
                {/* Notifications */}
                <button
                  type="button"
                  aria-label={`Abrir notificacoes${notifications > 0 ? `, ${notifications} pendentes` : ''}`}
                  className="relative rounded-xl p-2 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] hover:text-[var(--aethel-text-primary)]"
                >
                  <Bell className="w-5 h-5" />
                  {notifications > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center">
                      {notifications > 9 ? '9+' : notifications}
                    </span>
                  )}
                </button>

                {/* Plan Badge */}
                {user && (
                  <div className="hidden sm:block">
                    <PlanBadge plan={user.plan} />
                  </div>
                )}

                {/* User Menu */}
                <Dropdown
                  trigger={
                    <div className="flex items-center gap-2 rounded-xl border border-transparent p-1 transition-colors hover:border-white/10 hover:bg-white/[0.06] cursor-pointer">
                      <Avatar
                        src={user?.avatar}
                        name={user?.name || 'User'}
                        size="sm"
                        status="online"
                      />
                      <ChevronDown className="hidden h-4 w-4 text-[var(--aethel-text-tertiary)] sm:block" />
                    </div>
                  }
                  items={userMenuItems}
                  align="right"
                  width="md"
                />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="aethel-button aethel-button-ghost rounded-xl px-4 py-2 text-sm font-medium"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="aethel-button aethel-button-primary rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Comecar Gratis
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)] hover:text-[var(--aethel-text-primary)] md:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-[var(--aethel-border-secondary)] py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${pathname === link.href
                      ? 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] text-[var(--aethel-text-primary)]'
                      : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] hover:text-[var(--aethel-text-primary)]'
                    }
                  `}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="my-2 border-t border-[var(--aethel-border-secondary)]" />
              
              {productItems.filter(i => !i.divider).map((item) => (
                <Link
                  key={item.id}
                  href={item.href || '#'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] hover:text-[var(--aethel-text-primary)]"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
            <div 
              className="overflow-hidden rounded-xl border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(16,22,34,0.96),rgba(10,14,24,0.94))] shadow-[0_32px_90px_rgba(2,6,23,0.55)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-[var(--aethel-border-secondary)] px-4 py-3">
                <Search className="h-5 w-5 text-[var(--aethel-text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Buscar projetos, comandos, arquivos..."
                  className="flex-1 bg-transparent text-lg text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] outline-none"
                  autoFocus
                />
                <kbd className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_78%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-quaternary)]">ESC</kbd>
              </div>
              <div className="p-4 text-center text-sm text-[var(--aethel-text-quaternary)]">
                Digite para buscar...
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}


