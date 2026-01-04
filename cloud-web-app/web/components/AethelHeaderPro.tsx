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
      label: 'Configurações',
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
        localStorage.removeItem('aethel-token')
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left Section: Logo + Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white">
                Aethel
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Dropdown
                trigger={
                  <span className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
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
                    px-3 py-2 text-sm font-medium rounded-lg transition-colors
                    ${pathname === link.href
                      ? 'text-white bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
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
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 hover:text-slate-300 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Buscar...</span>
              <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-slate-500 bg-slate-900 rounded">
                ⌘K
              </kbd>
            </button>

            {isAuth ? (
              <>
                {/* Notifications */}
                <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
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
                    <div className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
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
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Começar Grátis
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
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
