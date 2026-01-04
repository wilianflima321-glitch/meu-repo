'use client'

import { useState, useEffect } from 'react'
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
  Save,
  AlertTriangle,
  Smartphone,
  Monitor,
  MapPin,
  Calendar
} from 'lucide-react'
import { AethelAPIClient } from '@/lib/api'
import { isAuthenticated, logout } from '@/lib/auth'

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

interface ActiveSession {
  id: string
  device: string
  browser: string
  ip: string
  location: string
  lastActive: string
  current: boolean
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
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 mb-6">
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 mb-4">{description}</p>
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
    <div className={`flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0 ${danger ? 'text-red-400' : ''}`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-slate-400" />
        <div>
          <div className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-white'}`}>{label}</div>
          {value && <div className="text-xs text-slate-500">{value}</div>}
        </div>
      </div>
      {action}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'sessions'>('profile')
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    
    loadProfile()
    loadSessions()
  }, [router])
  
  async function loadProfile() {
    try {
      setLoading(true)
      const response = await AethelAPIClient.getProfile()
      const data = response as any
      setProfile(data.profile || {
        id: 'usr_' + Date.now(),
        email: data.email || 'user@aethel.dev',
        name: data.name || 'Aethel User',
        createdAt: new Date().toISOString(),
        plan: data.plan || 'free',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: 'pt-BR',
        theme: 'dark',
        emailVerified: true,
        twoFactorEnabled: false,
        notifications: {
          email: true,
          push: true,
          marketing: false,
        }
      })
    } catch (error) {
      console.error('Failed to load profile:', error)
      // Use default profile on error
      setProfile({
        id: 'usr_' + Date.now(),
        email: 'user@aethel.dev',
        name: 'Aethel User',
        createdAt: new Date().toISOString(),
        plan: 'free',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: 'pt-BR',
        theme: 'dark',
        emailVerified: true,
        twoFactorEnabled: false,
        notifications: {
          email: true,
          push: true,
          marketing: false,
        }
      })
    } finally {
      setLoading(false)
    }
  }
  
  async function loadSessions() {
    // Mock sessions - em produção viria da API
    setSessions([
      {
        id: 'sess_1',
        device: 'Windows 11',
        browser: 'Chrome 120',
        ip: '192.168.1.100',
        location: 'São Paulo, BR',
        lastActive: new Date().toISOString(),
        current: true,
      },
      {
        id: 'sess_2',
        device: 'macOS Sonoma',
        browser: 'Safari 17',
        ip: '192.168.1.101',
        location: 'São Paulo, BR',
        lastActive: new Date(Date.now() - 3600000).toISOString(),
        current: false,
      },
    ])
  }
  
  async function updateProfile(updates: Partial<UserProfile>) {
    if (!profile) return
    
    setSaving(true)
    try {
      await AethelAPIClient.updateProfile(updates)
      setProfile({ ...profile, ...updates })
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setSaving(false)
    }
  }
  
  async function saveName() {
    if (!tempName.trim()) return
    await updateProfile({ name: tempName })
    setEditingName(false)
  }
  
  async function revokeSession(sessionId: string) {
    setSessions(sessions.filter(s => s.id !== sessionId))
    // Em produção: await AethelAPIClient.revokeSession(sessionId)
  }
  
  async function revokeAllSessions() {
    setSessions(sessions.filter(s => s.current))
    // Em produção: await AethelAPIClient.revokeAllSessions()
  }
  
  async function deleteAccount() {
    try {
      // Em produção: await AethelAPIClient.deleteAccount()
      logout()
      router.push('/')
    } catch (error) {
      console.error('Failed to delete account:', error)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }
  
  if (!profile) {
    return null
  }
  
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  profile.name.charAt(0).toUpperCase()
                )}
              </div>
              <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
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
                      className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xl font-bold"
                      autoFocus
                    />
                    <button onClick={saveName} className="text-green-400 hover:text-green-300">
                      <Check className="w-5 h-5" />
                    </button>
                    <button onClick={() => setEditingName(false)} className="text-red-400 hover:text-red-300">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold">{profile.name}</h1>
                    <button 
                      onClick={() => { setTempName(profile.name); setEditingName(true); }}
                      className="text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-slate-400">{profile.email}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="px-2 py-1 text-xs rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}
                </span>
                {profile.emailVerified && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <Check className="w-3 h-3" /> Email verificado
                  </span>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </header>
      
      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex gap-8">
            {[
              { id: 'profile', label: 'Perfil', icon: User },
              { id: 'security', label: 'Segurança', icon: Shield },
              { id: 'preferences', label: 'Preferências', icon: Palette },
              { id: 'sessions', label: 'Sessões', icon: Monitor },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-indigo-500 text-white' 
                    : 'border-transparent text-slate-400 hover:text-white'
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
            <ProfileSection title="Informações Básicas" description="Gerencie suas informações pessoais">
              <SettingRow 
                icon={User} 
                label="Nome" 
                value={profile.name}
                action={
                  <button 
                    onClick={() => { setTempName(profile.name); setEditingName(true); }}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    Editar
                  </button>
                }
              />
              <SettingRow 
                icon={Mail} 
                label="Email" 
                value={profile.email}
                action={
                  <button className="text-sm text-indigo-400 hover:text-indigo-300">
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
                value={profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}
                action={
                  <button 
                    onClick={() => router.push('/billing')}
                    className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                  >
                    Upgrade
                  </button>
                }
              />
            </ProfileSection>
          </>
        )}
        
        {/* Security Tab */}
        {activeTab === 'security' && (
          <>
            <ProfileSection title="Autenticação" description="Proteja sua conta com camadas adicionais de segurança">
              <SettingRow 
                icon={Key} 
                label="Senha" 
                value="Última alteração há 30 dias"
                action={
                  <button className="text-sm text-indigo-400 hover:text-indigo-300">
                    Alterar senha
                  </button>
                }
              />
              <SettingRow 
                icon={Smartphone} 
                label="Autenticação de dois fatores" 
                value={profile.twoFactorEnabled ? 'Ativada' : 'Desativada'}
                action={
                  <button 
                    onClick={() => updateProfile({ twoFactorEnabled: !profile.twoFactorEnabled })}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      profile.twoFactorEnabled 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {profile.twoFactorEnabled ? 'Desativar' : 'Ativar'}
                  </button>
                }
              />
            </ProfileSection>
            
            <ProfileSection title="Zona de Perigo" description="Ações irreversíveis">
              <SettingRow 
                icon={Trash2} 
                label="Excluir conta" 
                value="Esta ação não pode ser desfeita"
                danger
                action={
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
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
            <ProfileSection title="Aparência">
              <SettingRow 
                icon={Palette} 
                label="Tema" 
                value={profile.theme === 'dark' ? 'Escuro' : profile.theme === 'light' ? 'Claro' : 'Sistema'}
                action={
                  <select 
                    value={profile.theme}
                    onChange={(e) => updateProfile({ theme: e.target.value as any })}
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                  >
                    <option value="dark">Escuro</option>
                    <option value="light">Claro</option>
                    <option value="system">Sistema</option>
                  </select>
                }
              />
            </ProfileSection>
            
            <ProfileSection title="Localização">
              <SettingRow 
                icon={Globe} 
                label="Idioma" 
                value={profile.language === 'pt-BR' ? 'Português (Brasil)' : 'English'}
                action={
                  <select 
                    value={profile.language}
                    onChange={(e) => updateProfile({ language: e.target.value })}
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                }
              />
              <SettingRow 
                icon={Clock} 
                label="Fuso horário" 
                value={profile.timezone}
              />
            </ProfileSection>
            
            <ProfileSection title="Notificações">
              <SettingRow 
                icon={Bell} 
                label="Notificações por email" 
                action={
                  <button 
                    onClick={() => updateProfile({ 
                      notifications: { ...profile.notifications, email: !profile.notifications.email }
                    })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      profile.notifications.email ? 'bg-indigo-600' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                      profile.notifications.email ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                }
              />
              <SettingRow 
                icon={Bell} 
                label="Notificações push" 
                action={
                  <button 
                    onClick={() => updateProfile({ 
                      notifications: { ...profile.notifications, push: !profile.notifications.push }
                    })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      profile.notifications.push ? 'bg-indigo-600' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                      profile.notifications.push ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                }
              />
              <SettingRow 
                icon={Mail} 
                label="Emails de marketing" 
                action={
                  <button 
                    onClick={() => updateProfile({ 
                      notifications: { ...profile.notifications, marketing: !profile.notifications.marketing }
                    })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      profile.notifications.marketing ? 'bg-indigo-600' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                      profile.notifications.marketing ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                }
              />
            </ProfileSection>
          </>
        )}
        
        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <>
            <ProfileSection 
              title="Sessões ativas" 
              description="Gerencie os dispositivos conectados à sua conta"
            >
              <div className="flex justify-end mb-4">
                <button 
                  onClick={revokeAllSessions}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Encerrar todas as outras sessões
                </button>
              </div>
              
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div 
                    key={session.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      session.current ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Monitor className="w-8 h-8 text-slate-400" />
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {session.device} • {session.browser}
                          {session.current && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                              Sessão atual
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-400 flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {session.location} • {session.ip}
                        </div>
                        <div className="text-xs text-slate-500">
                          Última atividade: {new Date(session.lastActive).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    
                    {!session.current && (
                      <button
                        onClick={() => revokeSession(session.id)}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Encerrar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </ProfileSection>
          </>
        )}
      </main>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Excluir conta</h3>
            </div>
            
            <p className="text-slate-400 mb-6">
              Esta ação é <strong className="text-white">permanente e irreversível</strong>. 
              Todos os seus dados, projetos e configurações serão excluídos.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={deleteAccount}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Excluir minha conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
