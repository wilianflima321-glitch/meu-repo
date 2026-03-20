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
                  <span className="flex items-center gap-1.5 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-white/10 hover:bg-white/[0.06] hover:text-white">
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
                      ? 'text-white bg-white/[0.08] border border-white/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
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
              className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-slate-200"
            >
              <Search className="w-4 h-4" />
              <span>Buscar...</span>
              <kbd className="hidden lg:inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-xs text-slate-500">
                Ctrl+K
              </kbd>
            </button>

            {isAuth ? (
              <>
                {/* Notifications */}
                <button
                  type="button"
                  aria-label={`Abrir notificacoes${notifications > 0 ? `, ${notifications} pendentes` : ''}`}
                  className="relative rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
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
                      <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
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
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${pathname === link.href
                      ? 'text-white bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }
                  `}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="my-2 border-t border-slate-800" />
              
              {productItems.filter(i => !i.divider).map((item) => (
                <Link
                  key={item.id}
                  href={item.href || '#'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
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
              className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar projetos, comandos, arquivos..."
                  className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none text-lg"
                  autoFocus
                />
                <kbd className="px-2 py-1 text-xs text-slate-500 bg-slate-800 rounded">ESC</kbd>
              </div>
              <div className="p-4 text-center text-slate-500 text-sm">
                Digite para buscar...
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}


