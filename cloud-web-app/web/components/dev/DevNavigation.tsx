'use client';

/**
 * DevNavigation - Development Navigation Panel
 * 
 * Painel de navegação para testar todas as páginas do projeto.
 * Só aparece em desenvolvimento (NODE_ENV !== 'production')
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Home,
  LogIn,
  UserPlus,
  CreditCard,
  Layout,
  Box,
  Code2,
  Palette,
  Sparkles,
  FileText,
  HelpCircle,
  Activity,
  Download,
  Mail,
  Shield,
  Lock,
  Settings,
  Store,
  Users,
  Gamepad2,
  Film,
  Music,
  Layers,
  Cpu,
  Compass,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Unlock,
  Check,
} from 'lucide-react';

interface NavSection {
  title: string;
  icon: React.ReactNode;
  links: { name: string; href: string; icon?: React.ReactNode; status?: 'ok' | 'wip' | 'broken' }[];
}

const navSections: NavSection[] = [
  {
    title: 'Público',
    icon: <Home className="w-4 h-4" />,
    links: [
      { name: 'Landing Page', href: '/', icon: <Home className="w-3 h-3" />, status: 'ok' },
      { name: 'Login', href: '/login', icon: <LogIn className="w-3 h-3" />, status: 'ok' },
      { name: 'Register', href: '/register', icon: <UserPlus className="w-3 h-3" />, status: 'ok' },
      { name: 'Pricing', href: '/pricing', icon: <CreditCard className="w-3 h-3" />, status: 'ok' },
      { name: 'Contact', href: '/contact', icon: <Mail className="w-3 h-3" />, status: 'ok' },
      { name: 'Contact Sales', href: '/contact-sales', icon: <Users className="w-3 h-3" />, status: 'ok' },
    ],
  },
  {
    title: 'Recursos',
    icon: <FileText className="w-4 h-4" />,
    links: [
      { name: 'Documentação', href: '/docs', icon: <FileText className="w-3 h-3" />, status: 'ok' },
      { name: 'Suporte', href: '/support', icon: <HelpCircle className="w-3 h-3" />, status: 'ok' },
      { name: 'Status', href: '/status', icon: <Activity className="w-3 h-3" />, status: 'ok' },
      { name: 'Download', href: '/download', icon: <Download className="w-3 h-3" />, status: 'ok' },
      { name: 'Help', href: '/help', icon: <HelpCircle className="w-3 h-3" />, status: 'ok' },
    ],
  },
  {
    title: 'Legal',
    icon: <Shield className="w-4 h-4" />,
    links: [
      { name: 'Termos de Uso', href: '/terms', icon: <FileText className="w-3 h-3" />, status: 'ok' },
      { name: 'Privacidade', href: '/terms#privacy', icon: <Lock className="w-3 h-3" />, status: 'ok' },
    ],
  },
  {
    title: 'Dashboard',
    icon: <Layout className="w-4 h-4" />,
    links: [
      { name: 'Dashboard', href: '/dashboard?devMode=true', icon: <Layout className="w-3 h-3" />, status: 'ok' },
      { name: 'AI Assistant', href: '/ai-assistant?devMode=true', icon: <Sparkles className="w-3 h-3" />, status: 'ok' },
      { name: 'Profile', href: '/profile?devMode=true', icon: <Users className="w-3 h-3" />, status: 'ok' },
      { name: 'Settings', href: '/settings?devMode=true', icon: <Settings className="w-3 h-3" />, status: 'ok' },
      { name: 'Billing', href: '/billing?devMode=true', icon: <CreditCard className="w-3 h-3" />, status: 'ok' },
    ],
  },
  {
    title: 'Editor Hub',
    icon: <Compass className="w-4 h-4" />,
    links: [
      { name: 'Editor Hub', href: '/editor-hub?devMode=true', icon: <Compass className="w-3 h-3" />, status: 'ok' },
      { name: 'IDE Principal', href: '/ide?devMode=true', icon: <Code2 className="w-3 h-3" />, status: 'ok' },
      { name: 'Playground', href: '/playground?devMode=true', icon: <Gamepad2 className="w-3 h-3" />, status: 'ok' },
      { name: 'Studio', href: '/studio?devMode=true', icon: <Film className="w-3 h-3" />, status: 'ok' },
    ],
  },
  {
    title: 'Editores Principais',
    icon: <Box className="w-4 h-4" />,
    links: [
      { name: 'Level Editor', href: '/level-editor?devMode=true', icon: <Box className="w-3 h-3" />, status: 'ok' },
      { name: 'Visual Script', href: '/visual-script?devMode=true', icon: <Code2 className="w-3 h-3" />, status: 'ok' },
      { name: 'Material Editor', href: '/material-editor?devMode=true', icon: <Palette className="w-3 h-3" />, status: 'ok' },
      { name: 'VFX Editor', href: '/vfx-editor?devMode=true', icon: <Sparkles className="w-3 h-3" />, status: 'ok' },
      { name: 'Blueprint Editor', href: '/blueprint-editor?devMode=true', icon: <Layers className="w-3 h-3" />, status: 'ok' },
      { name: 'Scene Editor', href: '/scene-editor?devMode=true', icon: <Layers className="w-3 h-3" />, status: 'ok' },
    ],
  },
  {
    title: 'Editores Avançados',
    icon: <Cpu className="w-4 h-4" />,
    links: [
      { name: 'Animation Blueprint', href: '/animation-blueprint?devMode=true', status: 'ok' },
      { name: 'Behavior Tree', href: '/behavior-tree?devMode=true', status: 'ok' },
      { name: 'Control Rig', href: '/control-rig?devMode=true', status: 'ok' },
      { name: 'Niagara Editor', href: '/niagara-editor?devMode=true', status: 'ok' },
      { name: 'Dialogue Editor', href: '/dialogue-editor?devMode=true', status: 'ok' },
      { name: 'Quest Editor', href: '/quest-editor?devMode=true', status: 'ok' },
      { name: 'AI Command', href: '/ai-command?devMode=true', status: 'ok' },
    ],
  },
  {
    title: 'Editores de Arte',
    icon: <Palette className="w-4 h-4" />,
    links: [
      { name: 'Landscape Editor', href: '/landscape-editor?devMode=true', status: 'ok' },
      { name: 'Terrain Sculpting', href: '/terrain-sculpting?devMode=true', status: 'ok' },
      { name: 'Water Editor', href: '/water-editor?devMode=true', status: 'ok' },
      { name: 'Cloth Editor', href: '/cloth-editor?devMode=true', status: 'ok' },
      { name: 'Hair Editor', href: '/hair-editor?devMode=true', status: 'ok' },
      { name: 'Facial Editor', href: '/facial-editor?devMode=true', status: 'ok' },
      { name: 'Destruction Editor', href: '/destruction-editor?devMode=true', status: 'ok' },
      { name: 'Fluid Editor', href: '/fluid-editor?devMode=true', status: 'ok' },
    ],
  },
  {
    title: 'Mídia',
    icon: <Film className="w-4 h-4" />,
    links: [
      { name: 'Image Editor', href: '/image-editor?devMode=true', status: 'ok' },
      { name: 'Sprite Editor', href: '/sprite-editor?devMode=true', status: 'ok' },
      { name: 'Sound Editor', href: '/sound-editor?devMode=true', status: 'ok' },
      { name: 'Video Timeline', href: '/video-timeline?devMode=true', status: 'ok' },
      { name: 'Media Studio', href: '/media-studio?devMode=true', status: 'ok' },
    ],
  },
  {
    title: 'Ferramentas',
    icon: <Settings className="w-4 h-4" />,
    links: [
      { name: 'Content Browser', href: '/content-browser?devMode=true', status: 'ok' },
      { name: 'Explorer', href: '/explorer?devMode=true', status: 'ok' },
      { name: 'Terminal', href: '/terminal?devMode=true', status: 'ok' },
      { name: 'Debugger', href: '/debugger?devMode=true', status: 'ok' },
      { name: 'Git', href: '/git?devMode=true', status: 'ok' },
      { name: 'Export', href: '/export?devMode=true', status: 'ok' },
      { name: 'Preview', href: '/preview?devMode=true', status: 'ok' },
      { name: 'Live Preview', href: '/live-preview?devMode=true', status: 'ok' },
      { name: 'VR Preview', href: '/vr-preview?devMode=true', status: 'ok' },
    ],
  },
  {
    title: 'Marketplace',
    icon: <Store className="w-4 h-4" />,
    links: [
      { name: 'Marketplace', href: '/marketplace?devMode=true', icon: <Store className="w-3 h-3" />, status: 'ok' },
      { name: 'Marketplace Pro', href: '/marketplace-pro?devMode=true', icon: <Store className="w-3 h-3" />, status: 'ok' },
      { name: 'Showcase', href: '/showcase?devMode=true', icon: <Gamepad2 className="w-3 h-3" />, status: 'ok' },
    ],
  },
  {
    title: 'Admin',
    icon: <Shield className="w-4 h-4" />,
    links: [
      { name: 'Admin Panel', href: '/admin?devMode=true', icon: <Shield className="w-3 h-3" />, status: 'ok' },
    ],
  },
];

export default function DevNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Público']);
  const [devModeEnabled, setDevModeEnabled] = useState(false);
  
  // Check if dev mode is already enabled
  useEffect(() => {
    const checkDevMode = () => {
      const hasCookie = document.cookie.includes('aethel_dev_mode=enabled');
      setDevModeEnabled(hasCookie);
    };
    checkDevMode();
  }, []);
  
  // Enable dev mode permanently
  const enableDevMode = () => {
    document.cookie = 'aethel_dev_mode=enabled; path=/; max-age=604800'; // 7 days
    setDevModeEnabled(true);
    window.location.reload();
  };
  
  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  const toggleSection = (title: string) => {
    setExpandedSections(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };
  
  const statusColors = {
    ok: 'bg-green-500',
    wip: 'bg-yellow-500',
    broken: 'bg-red-500',
  };
  
  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-[9999] p-2 bg-violet-600 hover:bg-violet-500 rounded-lg shadow-lg text-white transition-colors"
        title="Dev Navigation"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      
      {/* Navigation Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-[9998]"
            />
            
            {/* Panel */}
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 w-96 h-full bg-slate-900 border-r border-slate-700 z-[9999] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-violet-900/50 to-indigo-900/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                      <Compass className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Dev Navigation</h2>
                      <p className="text-xs text-slate-400">Todas as páginas do projeto</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                
                {/* Dev Mode Toggle */}
                <div className="mt-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700">
                  {devModeEnabled ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <Check className="w-4 h-4" />
                      <span className="text-xs font-medium">Dev Mode Ativo - Acesso Total</span>
                    </div>
                  ) : (
                    <button
                      onClick={enableDevMode}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-white text-xs font-medium transition-all"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Ativar Dev Mode (Bypass Login)
                    </button>
                  )}
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-4 mt-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-slate-400">{navSections.reduce((acc, s) => acc + s.links.length, 0)} páginas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                    <span className="text-slate-400">{navSections.length} seções</span>
                  </div>
                </div>
              </div>
              
              {/* Navigation Sections */}
              <div className="flex-1 overflow-auto p-2">
                {navSections.map((section) => (
                  <div key={section.title} className="mb-1">
                    <button
                      onClick={() => toggleSection(section.title)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 group-hover:text-violet-400 transition-colors">
                          {section.icon}
                        </span>
                        <span className="text-sm font-medium text-slate-300">{section.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                          {section.links.length}
                        </span>
                      </div>
                      {expandedSections.includes(section.title) ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {expandedSections.includes(section.title) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-4 pr-2 py-1 space-y-0.5">
                            {section.links.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 transition-colors group"
                              >
                                <div className="flex items-center gap-2">
                                  {link.icon && (
                                    <span className="text-slate-500 group-hover:text-violet-400 transition-colors">
                                      {link.icon}
                                    </span>
                                  )}
                                  <span className="text-sm text-slate-400 group-hover:text-white transition-colors">
                                    {link.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {link.status && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusColors[link.status]}`} />
                                  )}
                                  <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-violet-400 transition-colors" />
                                </div>
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
              
              {/* Footer */}
              <div className="p-3 border-t border-slate-700 bg-slate-800/50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Dev Mode Ativo</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    localhost:3000
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
