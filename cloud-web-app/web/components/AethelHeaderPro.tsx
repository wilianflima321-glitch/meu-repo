'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
import { Avatar, Badge, PlanBadge, Dropdown, type DropdownItem } from './ui'
import { authHeaders, isAuthenticated, logout } from '@/lib/auth'

interface UserData {
  name: string
  email: string
  avatar?: string
  plan: 'free' | 'pro' | 'enterprise'
}

interface HeaderNotificationItem {
  id: string
  title: string
  message?: string | null
  read: boolean
  createdAt: string
}

export default function AethelHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuth, setIsAuth] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState(0)
  const [notificationItems, setNotificationItems] = useState<HeaderNotificationItem[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: authHeaders(),
        cache: 'no-store',
      })

      if (!response.ok) {
        setUser(null)
        return
      }

      const data = await response.json()
      const profile = data?.profile
      if (!profile) {
        setUser(null)
        return
      }

      setUser({
        name: profile.name || profile.email?.split('@')[0] || 'Conta',
        email: profile.email || '',
        avatar: profile.avatar || undefined,
        plan: profile.plan === 'enterprise' ? 'enterprise' : profile.plan === 'pro' ? 'pro' : 'free',
      })
    } catch {
      setUser(null)
    }
  }, [])

  const fetchNotificationCount = useCallback(async () => {
    try {
      setNotificationsLoading(true)
      const response = await fetch('/api/notifications?unread=true&limit=1', {
        headers: authHeaders(),
        cache: 'no-store',
      })
      if (!response.ok) {
        setNotifications(0)
        return
      }
      const data = await response.json()
      setNotifications(typeof data?.unreadCount === 'number' ? data.unreadCount : 0)
      setNotificationItems(Array.isArray(data?.notifications) ? data.notifications : [])
    } catch {
      setNotifications(0)
      setNotificationItems([])
    } finally {
      setNotificationsLoading(false)
    }
  }, [])

  useEffect(() => {
    const auth = isAuthenticated()
    setIsAuth(auth)

    if (auth) {
      void fetchUser()
      void fetchNotificationCount()
    } else {
      setUser(null)
      setNotifications(0)
      setNotificationsOpen(false)
      setNotificationItems([])
    }
  }, [fetchNotificationCount, fetchUser])

  const handleOpenSearch = () => {
    router.push('/ide?entry=search')
  }

  const handleToggleNotifications = async () => {
    const nextOpen = !notificationsOpen
    setNotificationsOpen(nextOpen)
    if (!nextOpen) return
    await fetchNotificationCount()
  }

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ markAllRead: true }),
      })
      if (!response.ok) return
      setNotifications(0)
      setNotificationItems((prev) => prev.map((item) => ({ ...item, read: true })))
    } catch {
      // Preserve current state if the request fails.
    }
  }

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
        logout(true)
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
    <header className="sticky top-0 z-40 w-full border-b border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(15,18,26,0.96),rgba(9,11,16,0.98))] backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--aethel-surface-primary)] focus:px-3 focus:py-2 focus:text-sm focus:text-[var(--aethel-text-primary)]"
      >
        Pular para o conteudo principal
      </a>
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
                className="h-8 w-8 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-1 shadow-[0_12px_30px_rgba(56,189,248,0.25)] transition-shadow group-hover:shadow-[0_12px_34px_rgba(99,102,241,0.35)]"
                priority
              />
              <span className="font-bold text-xl text-[var(--aethel-text-primary)]">
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
              onClick={handleOpenSearch}
              className="hidden sm:flex items-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] px-3 py-1.5 text-sm text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] hover:text-[var(--aethel-text-primary)]"
            >
              <Search className="w-4 h-4" />
              <span>Buscar no workbench</span>
              <kbd className="hidden lg:inline-flex items-center gap-1 rounded-md border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] px-1.5 py-0.5 text-xs text-[var(--aethel-text-quaternary)]">
                Ctrl+K
              </kbd>
            </button>

            {isAuth ? (
              <>
                {/* Notifications */}
                <div className="relative">
                  <button
                    type="button"
                    aria-label={`Abrir notificacoes${notifications > 0 ? `, ${notifications} pendentes` : ''}`}
                    onClick={() => {
                      void handleToggleNotifications()
                    }}
                    className="relative rounded-xl p-2 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] hover:text-[var(--aethel-text-primary)]"
                  >
                    <Bell className="w-5 h-5" />
                    {notifications > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--aethel-error)] px-1 text-[10px] font-bold text-[var(--aethel-text-inverse)]">
                        {notifications > 9 ? '9+' : notifications}
                      </span>
                    )}
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(16,22,34,0.98),rgba(10,14,24,0.98))] shadow-[0_24px_70px_rgba(2,6,23,0.55)]">
                      <div className="flex items-center justify-between border-b border-[var(--aethel-border-secondary)] px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Notificações</p>
                          <p className="text-xs text-[var(--aethel-text-quaternary)]">
                            {notifications > 0 ? `${notifications} pendentes` : 'Tudo em dia'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void handleMarkAllRead()
                          }}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] hover:text-[var(--aethel-text-primary)]"
                        >
                          Marcar tudo como lido
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notificationsLoading ? (
                          <div className="px-4 py-6 text-sm text-[var(--aethel-text-tertiary)]">
                            Carregando notificações...
                          </div>
                        ) : notificationItems.length > 0 ? (
                          notificationItems.map((item) => (
                            <div
                              key={item.id}
                              className="border-b border-[color-mix(in_srgb,var(--aethel-border-secondary)_65%,transparent)] px-4 py-3 last:border-b-0"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[var(--aethel-text-primary)]">{item.title}</p>
                                  {item.message && (
                                    <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{item.message}</p>
                                  )}
                                </div>
                                {!item.read && <Badge variant="error" size="sm">Nova</Badge>}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-sm text-[var(--aethel-text-tertiary)]">
                            Nenhuma notificação recente.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Plan Badge */}
                {user && (
                  <div className="hidden sm:block">
                    <PlanBadge plan={user.plan} />
                  </div>
                )}

                {/* User Menu */}
                <Dropdown
                  trigger={
                    <div className="flex items-center gap-2 rounded-xl border border-transparent p-1 transition-colors hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] cursor-pointer">
                      <Avatar src={user?.avatar} name={user?.name || 'Conta'} size="sm" status="online" />
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
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] transition-colors hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] hover:text-[var(--aethel-text-primary)]"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-4 py-2 text-sm font-semibold text-[var(--aethel-text-inverse)] shadow-[0_14px_32px_rgba(56,189,248,0.24)] transition-all hover:brightness-110"
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

    </header>
  )
}


