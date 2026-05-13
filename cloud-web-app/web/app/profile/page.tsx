'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  User,
  Mail,
  Shield,
  Key,
  Bell,
  Palette,
  Globe,
  CreditCard,
  Clock,
  LogOut,
  Trash2,
  Check,
  X,
  Camera,
  Edit2,
  AlertTriangle,
  Calendar
} from 'lucide-react'
import { AethelAPIClient } from '@/lib/api'
import { isAuthenticated, logout } from '@/lib/auth'
import StudioLayout from '@/components/studio/StudioLayout'
import TwoFactorSecurityPanel from '@/components/settings/TwoFactorSecurityPanel'
import { createComponentLogger } from '@/lib/observability/logger';

// ============================================================================
// Types
// ============================================================================

interface UserProfile {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
  lastLogin?: string
  plan: string
  timezone: string
  language: string
  theme: 'light' | 'dark' | 'system'
  emailVerified: boolean
  twoFactorEnabled: boolean
  notifications: {
    email: boolean
    push: boolean
    marketing: boolean
  }
}

// ============================================================================
// Components
// ============================================================================

function ProfileSection({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] rounded-xl border border-[var(--aethel-border-secondary)]/50 p-6 mb-6">
      <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--aethel-text-secondary)] mb-4">{description}</p>
      )}
      {children}
    </div>
  )
}

function SettingRow({
  icon: Icon,
  label,
  value,
  action,
  danger = false
}: {
  icon: React.ElementType
  label: string
  value?: string | React.ReactNode
  action?: React.ReactNode
  danger?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-3 border-b border-[var(--aethel-border-secondary)]/50 last:border-0 ${danger ? 'text-[var(--aethel-error)]' : ''}`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-[var(--aethel-text-secondary)]" />
        <div>
          <div className={`text-sm font-medium ${danger ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-text-primary)]'}`}>{label}</div>
          {value && <div className="text-xs text-[var(--aethel-text-tertiary)]">{value}</div>}
        </div>
      </div>
      {action}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

const logger = createComponentLogger('ProfilePage')

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile')
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const planLabels: Record<string, string> = {
    starter: 'Inicial',
    basic: 'Basico',
    pro: 'Pro',
    studio: 'Estudio',
    enterprise: 'Empresarial',
    free: 'Gratuito',
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    loadProfile()
  }, [router])

  async function loadProfile() {
    try {
      setLoading(true)
      const response = await AethelAPIClient.getProfile()
      const data = (response as any)?.profile ?? response
      setProfile({
        id: data.id,
        email: data.email,
        name: data.name || data.email?.split('@')[0] || 'Usuario',
        avatar: data.avatar || undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        lastLogin: data.lastLogin || undefined,
        plan: data.plan || 'free',
        timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: data.language || 'pt-BR',
        theme: data.theme || 'dark',
        emailVerified: Boolean(data.emailVerified),
        twoFactorEnabled: Boolean(data.twoFactorEnabled || data.mfaEnabled),
        notifications: {
          email: data.notifications?.email ?? true,
          push: data.notifications?.push ?? false,
          marketing: data.notifications?.marketing ?? false,
        }
      })
      setProfileError(null)
    } catch (error) {
      logger.error('Falha ao carregar o perfil', error)
      setProfileError('Nao foi possivel carregar o perfil. Tente novamente.')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!profile) return

    setSaving(true)
    try {
      const response = await AethelAPIClient.updateProfile(updates)
      const data = (response as any)?.profile ?? response
      setProfile({
        ...profile,
        ...updates,
        ...data,
        notifications: {
          ...profile.notifications,
          ...(data?.notifications || {}),
        },
      })
    } catch (error) {
      logger.error('Falha ao atualizar o perfil', error)
    } finally {
      setSaving(false)
    }
  }

  async function saveName() {
    if (!tempName.trim()) return
    await updateProfile({ name: tempName })
    setEditingName(false)
  }

  async function deleteAccount() {
    try {
      await AethelAPIClient.deleteAccount()
      logout()
      router.push('/')
    } catch (error) {
      logger.error('Falha ao excluir a conta', error)
    }
  }

  if (loading) {
    return (
      <StudioLayout title="Perfil" subtitle="Conta, seguranca e preferencias do workspace.">
        <div className="flex items-center justify-center px-6 py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--aethel-primary)]"></div>
        </div>
      </StudioLayout>
    )
  }

  if (!profile) {
    return (
      <StudioLayout title="Perfil" subtitle="Conta, seguranca e preferencias do workspace.">
        <div className="flex items-center justify-center px-6 py-12">
          <div className="text-[var(--aethel-text-secondary)]">{profileError || 'Perfil indisponivel.'}</div>
        </div>
      </StudioLayout>
    )
  }

  return (
    <StudioLayout title="Perfil" subtitle="Conta, seguranca e preferencias do workspace.">
      {/* Header */}
      <header className="border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--aethel-primary)] to-[var(--aethel-info)] flex items-center justify-center text-3xl font-bold">
                {profile.avatar ? (
                  <Image
                    src={profile.avatar}
                    alt={profile.name}
                    width={80}
                    height={80}
                    unoptimized
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  profile.name.charAt(0).toUpperCase()
                )}
              </div>
              <button
                type="button"
                aria-label="Alterar foto de perfil"
                className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="bg-[var(--aethel-surface-tertiary)] border border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] rounded px-2 py-1 text-xl font-bold"
                      autoFocus
                    />
                    <button type="button" onClick={saveName} className="text-[var(--aethel-success)] hover:text-[var(--aethel-success-light)]">
                      <Check className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={() => setEditingName(false)} className="text-[var(--aethel-error)] hover:text-[var(--aethel-error-light)]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold">{profile.name}</h1>
                    <button type="button"
                      onClick={() => { setTempName(profile.name); setEditingName(true); }}
                      className="text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-[var(--aethel-text-secondary)]">{profile.email}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="px-2 py-1 text-xs rounded-full bg-[var(--aethel-primary)]/20 text-[var(--aethel-primary-light)] border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]">
                  {planLabels[profile.plan] ?? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}
                </span>
                {profile.emailVerified && (
                  <span className="flex items-center gap-1 text-xs text-[var(--aethel-success)]">
                    <Check className="w-3 h-3" /> E-mail verificado
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <button type="button"
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] rounded-lg transition-colors"
            >
              Voltar ao painel
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-[var(--aethel-border-primary)]">
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex gap-8">
            {[
              { id: 'profile', label: 'Perfil', icon: User },
              { id: 'security', label: 'Seguranca', icon: Shield },
              { id: 'preferences', label: 'Preferencias', icon: Palette },
            ].map((tab) => (
              <button type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
                    : 'border-transparent text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <>
            <ProfileSection title="Informacoes Basicas" description="Gerencie suas informacoes pessoais">
              <SettingRow
                icon={User}
                label="Nome"
                value={profile.name}
                action={
                  <button type="button"
                    onClick={() => { setTempName(profile.name); setEditingName(true); }}
                    className="text-sm text-[var(--aethel-primary-light)] hover:text-[var(--aethel-text-primary)]"
                  >
                    Editar
                  </button>
                }
              />
              <SettingRow
                icon={Mail}
                label="E-mail"
                value={profile.email}
                action={
                  <button type="button" className="text-sm text-[var(--aethel-primary-light)] hover:text-[var(--aethel-text-primary)]">
                    Alterar
                  </button>
                }
              />
              <SettingRow
                icon={Calendar}
                label="Membro desde"
                value={new Date(profile.createdAt).toLocaleDateString('pt-BR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              />
            </ProfileSection>

            <ProfileSection title="Plano e Faturamento">
              <SettingRow
                icon={CreditCard}
                label="Plano atual"
                value={planLabels[profile.plan] ?? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}
                action={
                  <button type="button"
                    onClick={() => router.push('/billing')}
                    className="px-3 py-1 text-sm bg-[var(--aethel-primary-dark)] hover:bg-[var(--aethel-primary)] rounded-lg transition-colors"
                  >
                    Atualizar plano
                  </button>
                }
              />
            </ProfileSection>
          </>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <>
            <ProfileSection title="Autenticacao" description="Proteja sua conta com camadas adicionais de seguranca">
              <SettingRow
                icon={Key}
                label="Senha"
                value="Ultima alteracao ha 30 dias"
                action={
                  <button type="button" className="text-sm text-[var(--aethel-primary-light)] hover:text-[var(--aethel-text-primary)]">
                    Alterar senha
                  </button>
                }
              />
            </ProfileSection>

            <TwoFactorSecurityPanel
              variant="profile"
              onStatusChange={(enabled) =>
                setProfile((current) => (current ? { ...current, twoFactorEnabled: enabled } : current))
              }
            />

            <ProfileSection title="Zona de Perigo" description="Acoes irreversiveis">
              <SettingRow
                icon={Trash2}
                label="Excluir conta"
                value="Esta acao nao pode ser desfeita"
                danger
                action={
                  <button type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-1 text-sm bg-[var(--aethel-error-dark)] hover:bg-[var(--aethel-error)] rounded-lg transition-colors"
                  >
                    Excluir
                  </button>
                }
              />
            </ProfileSection>
          </>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <>
            <ProfileSection title="Aparencia">
              <SettingRow
                icon={Palette}
                label="Tema"
                value={profile.theme === 'dark' ? 'Escuro' : profile.theme === 'light' ? 'Claro' : 'Sistema'}
                action={
                  <select
                    value={profile.theme}
                    onChange={(e) => updateProfile({ theme: e.target.value as any })}
                    className="bg-[var(--aethel-surface-quaternary)] border border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] rounded px-2 py-1 text-sm"
                  >
                    <option value="dark">Escuro</option>
                    <option value="light">Claro</option>
                    <option value="system">Sistema</option>
                  </select>
                }
              />
            </ProfileSection>

            <ProfileSection title="Localizacao">
              <SettingRow
                icon={Globe}
                label="Idioma"
                value={profile.language === 'pt-BR' ? 'Portugues (Brasil)' : 'Ingles'}
                action={
                  <select
                    value={profile.language}
                    onChange={(e) => updateProfile({ language: e.target.value })}
                    className="bg-[var(--aethel-surface-quaternary)] border border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] rounded px-2 py-1 text-sm"
                  >
                    <option value="pt-BR">Portugues (Brasil)</option>
                    <option value="en-US">Ingles (EUA)</option>
                  </select>
                }
              />
              <SettingRow
                icon={Clock}
                label="Fuso horario"
                value={profile.timezone}
              />
            </ProfileSection>

            <ProfileSection title="Notificacoes">
              <SettingRow
                icon={Bell}
                label="Notificacoes por e-mail"
                action={
                  <button type="button"
                    onClick={() => updateProfile({
                      notifications: { ...profile.notifications, email: !profile.notifications.email }
                    })}
                    aria-label="Alternar notificacoes por email"
                    aria-pressed={profile.notifications.email}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      profile.notifications.email ? 'bg-[var(--aethel-primary-dark)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-[var(--aethel-text-primary)] transform transition-transform ${
                      profile.notifications.email ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                }
              />
              <SettingRow
                icon={Bell}
                label="Notificacoes push"
                action={
                  <button type="button"
                    onClick={() => updateProfile({
                      notifications: { ...profile.notifications, push: !profile.notifications.push }
                    })}
                    aria-label="Alternar notificacoes push"
                    aria-pressed={profile.notifications.push}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      profile.notifications.push ? 'bg-[var(--aethel-primary-dark)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-[var(--aethel-text-primary)] transform transition-transform ${
                      profile.notifications.push ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                }
              />
              <SettingRow
                icon={Mail}
                label="E-mails de marketing"
                action={
                  <button type="button"
                    onClick={() => updateProfile({
                      notifications: { ...profile.notifications, marketing: !profile.notifications.marketing }
                    })}
                    aria-label="Alternar emails de marketing"
                    aria-pressed={profile.notifications.marketing}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      profile.notifications.marketing ? 'bg-[var(--aethel-primary-dark)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-[var(--aethel-text-primary)] transform transition-transform ${
                      profile.notifications.marketing ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                }
              />
            </ProfileSection>
          </>
        )}

      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] flex items-center justify-center z-50">
          <div className="bg-[var(--aethel-surface-tertiary)] rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--aethel-error)]/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[var(--aethel-error)]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--aethel-text-primary)]">Excluir conta</h3>
            </div>

            <p className="text-[var(--aethel-text-secondary)] mb-6">
              Esta acao e <strong className="text-[var(--aethel-text-primary)]">permanente e irreversivel</strong>.
              Todos os seus dados, projetos e configuracoes serao excluidos.
            </p>

            <div className="flex gap-3">
              <button type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button type="button"
                onClick={deleteAccount}
                className="flex-1 px-4 py-2 bg-[var(--aethel-error-dark)] hover:bg-[var(--aethel-error)] rounded-lg transition-colors"
              >
                Excluir minha conta
              </button>
            </div>
          </div>
        </div>
      )}
    </StudioLayout>
  )
}
