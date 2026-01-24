'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AETHEL ENGINE - AAA Landing Page
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Landing page profissional nível studio com:
 * - Hero com 3D background animado
 * - Features showcase
 * - Pricing plans
 * - Social proof
 * - CTA sections
 */

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Sparkles,
  Zap,
  Cpu,
  Globe,
  Users,
  Shield,
  ArrowRight,
  Check,
  Star,
  ChevronRight,
  Box,
  Palette,
  Film,
  Music,
  Gamepad2,
  Code2,
  Layers,
  Wand2,
  Rocket,
  Crown,
  Building2,
  Github,
  Twitter,
  Youtube,
  MessageCircle,
  X,
} from 'lucide-react';
import { AETHEL_COLORS } from '@/lib/design/aethel-design-system';

// ═══════════════════════════════════════════════════════════════════════════════
// HERO SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function HeroSection() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[#09090b]">
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        />
        
        {/* Gradient orbs */}
        <div 
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-30 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
            transform: `translate(${mousePosition.x * 2}px, ${mousePosition.y * 2}px)`,
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
            transform: `translate(${-mousePosition.x * 1.5}px, ${-mousePosition.y * 1.5}px)`,
          }}
        />
        <div 
          className="absolute top-1/2 right-1/3 w-[400px] h-[400px] rounded-full opacity-15 blur-[80px]"
          style={{
            background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
            transform: `translate(${mousePosition.x}px, ${-mousePosition.y}px)`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8"
        >
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-blue-400">Now in Public Beta • v1.0.0</span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
        >
          <span className="bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
            The Future of
          </span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
            Game Development
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12"
        >
          Professional game engine with AI-powered tools, real-time collaboration,
          and AAA-quality rendering. Build games faster than ever before.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link
            href="/register"
            className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl text-white font-semibold text-lg transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
            <Rocket className="w-5 h-5" />
            Start Building Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/studio"
            className="group flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-white font-semibold text-lg transition-all duration-300"
          >
            <Play className="w-5 h-5" />
            Try Live Demo
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
          {[
            { value: '50K+', label: 'Active Developers' },
            { value: '10M+', label: 'Assets Created' },
            { value: '99.9%', label: 'Uptime SLA' },
            { value: '<50ms', label: 'Global Latency' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-white/50"
          />
        </div>
      </motion.div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURES SECTION
// ═══════════════════════════════════════════════════════════════════════════════

const features = [
  {
    icon: Cpu,
    title: 'AI-Powered Development',
    description: 'Generate code, assets, and entire game systems with natural language prompts.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Layers,
    title: 'Visual Scripting',
    description: 'Build complex game logic without writing code using our node-based editor.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Globe,
    title: 'Cloud-Native Engine',
    description: 'Work from anywhere. Your projects sync instantly across all devices.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Users,
    title: 'Real-Time Collaboration',
    description: 'Work with your team simultaneously. See changes as they happen.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: Wand2,
    title: 'Procedural Generation',
    description: 'Generate infinite worlds, terrains, and content with AI algorithms.',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption and advanced access controls.',
    color: 'from-slate-500 to-zinc-500',
  },
];

function FeaturesSection() {
  return (
    <section className="py-32 bg-[#0c0c0e] relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6"
          >
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-400">Powerful Features</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-6"
          >
            Everything You Need to Build
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Amazing Games
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto"
          >
            From concept to launch, Aethel Engine provides all the tools professional studios need.
          </motion.p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-8 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 hover:border-white/10 transition-all duration-300"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} p-3 mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-full h-full text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAMES SHOWCASE - Featured Projects (Like Unreal Engine)
// ═══════════════════════════════════════════════════════════════════════════════

const featuredGames = [
  {
    title: 'Ethereal Kingdoms',
    studio: 'Phantom Studios',
    genre: 'Open World RPG',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
    tags: ['AAA', 'Open World', 'Multiplayer'],
    stats: { players: '2M+', rating: '4.9' },
  },
  {
    title: 'Velocity Zero',
    studio: 'Hyperdrive Games',
    genre: 'Sci-Fi Racing',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
    tags: ['Racing', 'VR Support', 'Cross-Platform'],
    stats: { players: '800K+', rating: '4.7' },
  },
  {
    title: 'Shadow Protocol',
    studio: 'Stealth Works',
    genre: 'Tactical Shooter',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
    tags: ['Shooter', 'Competitive', 'Esports'],
    stats: { players: '5M+', rating: '4.8' },
  },
  {
    title: 'Mystic Gardens',
    studio: 'Indie Bloom',
    genre: 'Cozy Simulation',
    image: 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=800&q=80',
    tags: ['Indie', 'Relaxing', 'Creative'],
    stats: { players: '500K+', rating: '4.9' },
  },
];

function GamesShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeGame = featuredGames[activeIndex];

  return (
    <section className="py-32 bg-[#09090b] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-purple-500/10 via-blue-500/5 to-transparent blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 mb-6"
          >
            <Gamepad2 className="w-4 h-4 text-pink-400" />
            <span className="text-sm text-pink-400">Made with Aethel</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-6"
          >
            Games Powered by
            <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent"> Aethel</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto"
          >
            From indie gems to AAA blockbusters, see what developers are creating
          </motion.p>
        </div>

        {/* Featured Game Display */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Main Showcase */}
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-2 relative rounded-2xl overflow-hidden group"
          >
            {/* Game Image */}
            <div className="aspect-video relative">
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${activeGame.image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              
              {/* Play Button Overlay */}
              <motion.div 
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                initial={false}
              >
                <button className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Play className="w-8 h-8 text-white ml-1" />
                </button>
              </motion.div>
            </div>

            {/* Game Info */}
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex items-center gap-3 mb-3">
                {activeGame.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs text-white/80">
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">{activeGame.title}</h3>
              <p className="text-gray-300 mb-4">{activeGame.studio} • {activeGame.genre}</p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-white">{activeGame.stats.players} Players</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white">{activeGame.stats.rating}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Game Selection Sidebar */}
          <div className="space-y-4">
            {featuredGames.map((game, index) => (
              <motion.button
                key={index}
                onClick={() => setActiveIndex(index)}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`w-full p-4 rounded-xl text-left transition-all duration-300 ${
                  index === activeIndex 
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30' 
                    : 'bg-white/5 border border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-12 rounded-lg bg-cover bg-center flex-shrink-0"
                    style={{ backgroundImage: `url(${game.image})` }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold truncate ${index === activeIndex ? 'text-white' : 'text-gray-300'}`}>
                      {game.title}
                    </h4>
                    <p className="text-sm text-gray-500 truncate">{game.studio}</p>
                  </div>
                  {index === activeIndex && (
                    <ChevronRight className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Link
            href="/showcase"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/20 rounded-xl text-white font-medium transition-all"
          >
            <Film className="w-4 h-4" />
            View All Projects
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDITORS SHOWCASE - Links to Real Pages
// ═══════════════════════════════════════════════════════════════════════════════

const editorShowcase = [
  { icon: Box, name: 'Level Editor', description: 'Construa mundos 3D imersivos', href: '/level-editor' },
  { icon: Palette, name: 'Material Editor', description: 'Crie materiais PBR impressionantes', href: '/material-editor' },
  { icon: Sparkles, name: 'VFX Editor', description: 'Design de partículas e efeitos', href: '/vfx-editor' },
  { icon: Film, name: 'Sequencer', description: 'Crie cinematics e cutscenes', href: '/video-timeline' },
  { icon: Music, name: 'Audio Editor', description: 'Som 3D espacial', href: '/sound-editor' },
  { icon: Code2, name: 'Blueprint', description: 'Scripting visual sem código', href: '/visual-script' },
  { icon: Gamepad2, name: 'Animation', description: 'Blueprints de animação', href: '/animation-blueprint' },
  { icon: Layers, name: 'Terrain Tools', description: 'Esculpa paisagens', href: '/terrain-sculpting' },
];

function EditorsShowcase() {
  return (
    <section id="editors" className="py-32 bg-[#09090b] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/20 to-transparent blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6"
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400">30+ Editores Profissionais</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-white mb-6"
          >
            Todas as Ferramentas que Você Precisa
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto"
          >
            Editores integrados para cada aspecto do desenvolvimento de jogos
          </motion.p>
        </div>

        {/* Editors Grid - Now with Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {editorShowcase.map((editor, index) => (
            <Link
              key={index}
              href={editor.href}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group p-6 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-300 cursor-pointer h-full"
              >
                <editor.icon className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">{editor.name}</h3>
                <p className="text-sm text-gray-500">{editor.description}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Abrir Editor <ChevronRight className="w-3 h-3" />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/editor-hub"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/20 rounded-xl text-white font-medium transition-all"
          >
            Ver Todos os 30+ Editores
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING SECTION - Professional Comparison
// ═══════════════════════════════════════════════════════════════════════════════

const pricingPlans = [
  {
    name: 'Hobby',
    price: 'Grátis',
    period: 'para sempre',
    description: 'Perfeito para aprender e projetos pessoais',
    icon: Rocket,
    color: 'from-slate-500 to-slate-600',
    features: [
      { name: 'Até 3 projetos', included: true },
      { name: '500MB armazenamento', included: true },
      { name: 'Editor completo', included: true },
      { name: '20+ editores básicos', included: true },
      { name: 'Export Web', included: true },
      { name: 'Suporte comunidade', included: true },
      { name: 'IA básica (GPT-3.5)', included: true },
      { name: 'Colaboração real-time', included: false },
      { name: 'Exports nativos', included: false },
      { name: 'Suporte prioritário', included: false },
    ],
    cta: 'Começar Grátis',
    href: '/register',
    popular: false,
  },
  {
    name: 'Pro',
    price: 'R$ 97',
    period: '/mês',
    description: 'Para desenvolvedores indie e pequenas equipes',
    icon: Crown,
    color: 'from-indigo-500 to-purple-600',
    features: [
      { name: 'Projetos ilimitados', included: true },
      { name: '50GB armazenamento', included: true },
      { name: 'Editor completo', included: true },
      { name: '30+ editores profissionais', included: true },
      { name: 'Export Web, Windows, Mac', included: true },
      { name: 'Suporte email 24h', included: true },
      { name: 'IA avançada (GPT-4, Claude)', included: true },
      { name: 'Colaboração real-time (até 5)', included: true },
      { name: 'Assets Premium inclusos', included: true },
      { name: 'Versioning Git integrado', included: true },
    ],
    cta: 'Testar 14 dias grátis',
    href: '/register?plan=pro',
    popular: true,
  },
  {
    name: 'Studio',
    price: 'R$ 297',
    period: '/mês',
    description: 'Para estúdios e equipes grandes',
    icon: Building2,
    color: 'from-amber-500 to-orange-600',
    features: [
      { name: 'Tudo do Pro +', included: true },
      { name: '500GB armazenamento', included: true },
      { name: 'Editores enterprise', included: true },
      { name: 'Export todas plataformas', included: true },
      { name: 'Console exports (Xbox, PS, Switch)', included: true },
      { name: 'Suporte dedicado + SLA', included: true },
      { name: 'IA ilimitada + fine-tuning', included: true },
      { name: 'Colaboração ilimitada', included: true },
      { name: 'Treinamento da equipe', included: true },
      { name: 'API e integrações custom', included: true },
    ],
    cta: 'Falar com Vendas',
    href: '/contact-sales',
    popular: false,
  },
];

function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  return (
    <section id="pricing" className="py-32 bg-gradient-to-b from-[#0c0c0e] to-[#09090b] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6"
          >
            <Star className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">Preços Transparentes</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Escolha o Plano Ideal
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 mb-8"
          >
            Comece grátis, escale conforme cresce. Sem surpresas.
          </motion.p>
          
          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-3 p-1 bg-white/5 rounded-full"
          >
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === 'monthly' 
                  ? 'bg-white text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === 'yearly' 
                  ? 'bg-white text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Anual <span className="text-green-500 ml-1">-20%</span>
            </button>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl overflow-hidden ${
                plan.popular
                  ? 'ring-2 ring-indigo-500 scale-[1.02]'
                  : ''
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-center text-sm font-semibold">
                  🔥 Mais Popular
                </div>
              )}
              
              <div className={`p-8 bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 h-full flex flex-col ${plan.popular ? 'pt-14' : ''}`}>
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                    <plan.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                    <p className="text-sm text-gray-400">{plan.description}</p>
                  </div>
                </div>
                
                {/* Price */}
                <div className="mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">
                      {plan.price === 'Grátis' ? 'Grátis' : (
                        billingPeriod === 'yearly' && plan.price !== 'Grátis' 
                          ? `R$ ${Math.round(parseInt(plan.price.replace('R$ ', '')) * 0.8)}`
                          : plan.price
                      )}
                    </span>
                    {plan.period && plan.price !== 'Grátis' && (
                      <span className="text-gray-400">{plan.period}</span>
                    )}
                  </div>
                  {plan.price !== 'Grátis' && billingPeriod === 'yearly' && (
                    <p className="text-sm text-green-400 mt-1">Economize 20% no plano anual</p>
                  )}
                </div>
                
                {/* Features */}
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      ) : (
                        <X className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-gray-300' : 'text-gray-500'}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
                
                {/* CTA */}
                <Link
                  href={plan.href}
                  className={`block w-full py-4 rounded-xl font-semibold text-center transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500 text-sm mb-4">Aceito por desenvolvedores em todo o mundo</p>
          <div className="flex items-center justify-center gap-8 opacity-50">
            <span className="text-gray-400">🔒 Pagamento Seguro</span>
            <span className="text-gray-400">💳 Cancele quando quiser</span>
            <span className="text-gray-400">🎁 14 dias de teste grátis</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CTA SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function CTASection() {
  return (
    <section className="py-32 bg-[#09090b] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 blur-[100px]" />
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-6xl font-bold text-white mb-6"
        >
          Pronto para Criar
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Seu Jogo dos Sonhos?
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-xl text-gray-400 mb-10"
        >
          Junte-se a milhares de desenvolvedores já criando jogos incríveis com Aethel Studio.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/register"
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-white font-semibold text-lg transition-all shadow-lg shadow-purple-500/25"
          >
            <Rocket className="w-5 h-5" />
            Começar Grátis
          </Link>
          <Link
            href="/contact-sales"
            className="flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-semibold text-lg transition-all"
          >
            Falar com Vendas
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOOTER - With Working Links Only
// ═══════════════════════════════════════════════════════════════════════════════

function Footer() {
  const footerLinks = {
    Produto: [
      { name: 'Preços', href: '/pricing' },
      { name: 'Editor Hub', href: '/editor-hub' },
      { name: 'Marketplace', href: '/marketplace' },
      { name: 'Dashboard', href: '/dashboard' },
    ],
    Recursos: [
      { name: 'Documentação', href: '/docs' },
      { name: 'Suporte', href: '/support' },
      { name: 'Status', href: '/status' },
      { name: 'Download', href: '/download' },
    ],
    Editores: [
      { name: 'Level Editor', href: '/level-editor' },
      { name: 'Visual Script', href: '/visual-script' },
      { name: 'Material Editor', href: '/material-editor' },
      { name: 'VFX Editor', href: '/vfx-editor' },
    ],
    Legal: [
      { name: 'Termos de Uso', href: '/terms' },
      { name: 'Privacidade', href: '/privacy' },
      { name: 'Contato', href: '/contact' },
    ],
  };

  return (
    <footer className="bg-[#09090b] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-6 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                  <path d="M16 4L28 26H4L16 4Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <line x1="9" y1="20" x2="23" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="16" cy="16" r="2.5" fill="white" opacity="0.9"/>
                </svg>
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-light text-white/90">AETHEL</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">STUDIO</span>
              </div>
            </div>
            <p className="text-gray-400 mb-6">
              The next generation game engine for professional developers.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://github.com/aethel" className="text-gray-500 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/aethel" className="text-gray-500 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://youtube.com/aethel" className="text-gray-500 hover:text-white transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="https://discord.gg/aethel" className="text-gray-500 hover:text-white transition-colors">
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors text-sm">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © 2026 Aethel Engine. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-gray-500 text-sm">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Professional Logo */}
            <div className="relative w-10 h-10">
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/50 via-purple-500/50 to-pink-500/50 blur-md opacity-0 group-hover:opacity-60 transition-opacity" />
              {/* Main icon */}
              <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                  <path d="M16 4L28 26H4L16 4Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <line x1="9" y1="20" x2="23" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="16" cy="16" r="2.5" fill="white" opacity="0.9"/>
                </svg>
              </div>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-light text-white/90">AETHEL</span>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">STUDIO</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/showcase" className="text-gray-400 hover:text-white transition-colors">Showcase</Link>
            <Link href="/editor-hub" className="text-gray-400 hover:text-white transition-colors">Editors</Link>
            <Link href="/marketplace" className="text-gray-400 hover:text-white transition-colors">Marketplace</Link>
            <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link>
            <Link href="/docs" className="text-gray-400 hover:text-white transition-colors">Docs</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-gray-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Page Sections */}
      <HeroSection />
      <EditorsShowcase />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}
