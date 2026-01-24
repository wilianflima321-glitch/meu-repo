'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AETHEL ENGINE - Showcase Page
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Página de showcase de jogos e projetos feitos com Aethel Engine
 * Similar ao showcase da Unreal Engine
 */

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2,
  Play,
  Users,
  Star,
  Filter,
  Search,
  ChevronRight,
  ArrowLeft,
  Globe,
  Calendar,
  Award,
  ExternalLink,
  Heart,
  Eye,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// SHOWCASE DATA
// ═══════════════════════════════════════════════════════════════════════════════

const showcaseProjects = [
  {
    id: '1',
    title: 'Ethereal Kingdoms',
    studio: 'Phantom Studios',
    genre: 'Open World RPG',
    description: 'An epic open-world RPG set in a mystical realm where magic and technology collide. Explore vast landscapes, engage in tactical combat, and shape the destiny of nations.',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
    tags: ['AAA', 'Open World', 'Multiplayer', 'Fantasy'],
    platforms: ['PC', 'PlayStation', 'Xbox'],
    releaseDate: '2025',
    stats: { players: '2M+', rating: '4.9', views: '15M' },
    featured: true,
    awards: ['Best RPG 2025', 'Player\'s Choice'],
  },
  {
    id: '2',
    title: 'Velocity Zero',
    studio: 'Hyperdrive Games',
    genre: 'Sci-Fi Racing',
    description: 'Experience the future of anti-gravity racing. Compete in breakneck speeds across procedurally generated tracks spanning alien worlds.',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80',
    tags: ['Racing', 'VR Support', 'Cross-Platform', 'Sci-Fi'],
    platforms: ['PC', 'VR', 'Mobile'],
    releaseDate: '2025',
    stats: { players: '800K+', rating: '4.7', views: '8M' },
    featured: true,
    awards: ['Best VR Experience'],
  },
  {
    id: '3',
    title: 'Shadow Protocol',
    studio: 'Stealth Works',
    genre: 'Tactical Shooter',
    description: 'A competitive tactical shooter with destructible environments, realistic ballistics, and deep team-based gameplay.',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80',
    tags: ['Shooter', 'Competitive', 'Esports', 'Tactical'],
    platforms: ['PC', 'PlayStation', 'Xbox'],
    releaseDate: '2024',
    stats: { players: '5M+', rating: '4.8', views: '25M' },
    featured: true,
    awards: ['Esports Game of the Year'],
  },
  {
    id: '4',
    title: 'Mystic Gardens',
    studio: 'Indie Bloom',
    genre: 'Cozy Simulation',
    description: 'A relaxing garden simulation where you cultivate magical plants, befriend forest spirits, and build your dream sanctuary.',
    image: 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&q=80',
    tags: ['Indie', 'Relaxing', 'Creative', 'Simulation'],
    platforms: ['PC', 'Nintendo Switch', 'Mobile'],
    releaseDate: '2025',
    stats: { players: '500K+', rating: '4.9', views: '3M' },
    featured: false,
    awards: ['Best Indie Game'],
  },
  {
    id: '5',
    title: 'Neon Synth',
    studio: 'Retrowave Studios',
    genre: 'Rhythm Action',
    description: 'A synthwave-inspired rhythm game with procedurally generated tracks and stunning neon visuals.',
    image: 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=400&q=80',
    tags: ['Rhythm', 'Music', 'Indie', 'Retro'],
    platforms: ['PC', 'Mobile'],
    releaseDate: '2024',
    stats: { players: '300K+', rating: '4.6', views: '2M' },
    featured: false,
    awards: [],
  },
  {
    id: '6',
    title: 'Titan\'s Legacy',
    studio: 'Epic Forge',
    genre: 'Action Adventure',
    description: 'A souls-like action adventure featuring colossal boss battles and interconnected world design.',
    image: 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=400&q=80',
    tags: ['Action', 'Souls-like', 'Boss Battles', 'Dark Fantasy'],
    platforms: ['PC', 'PlayStation', 'Xbox'],
    releaseDate: '2025',
    stats: { players: '1.2M+', rating: '4.8', views: '10M' },
    featured: true,
    awards: ['Best Action Game'],
  },
];

const categories = ['All', 'AAA', 'Indie', 'Multiplayer', 'VR', 'Mobile'];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ShowcasePage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<typeof showcaseProjects[0] | null>(null);

  const filteredProjects = showcaseProjects.filter(project => {
    const matchesCategory = selectedCategory === 'All' || project.tags.includes(selectedCategory);
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          project.studio.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          project.genre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredProjects = showcaseProjects.filter(p => p.featured);

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <h1 className="text-xl font-bold">Showcase</h1>
          </div>
          
          <Link href="/register" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors">
            Start Creating
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-purple-500/20 via-pink-500/10 to-transparent blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <Gamepad2 className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-400">Made with Aethel</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Games & Projects
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Discover amazing games and experiences built with Aethel Engine by developers around the world.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { value: '500+', label: 'Published Games' },
              { value: '50M+', label: 'Total Players' },
              { value: '120+', label: 'Countries' },
              { value: '$1B+', label: 'Revenue Generated' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-4 rounded-xl bg-white/5 border border-white/5"
              >
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Projects Carousel */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <Award className="w-6 h-6 text-yellow-400" />
            Featured Games
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredProjects.slice(0, 3).map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedProject(project)}
                className="group relative rounded-2xl overflow-hidden cursor-pointer"
              >
                <div className="aspect-[16/10] relative">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundImage: `url(${project.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white ml-1" />
                    </div>
                  </div>

                  {/* Featured badge */}
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-xs text-yellow-400">
                      ⭐ Featured
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-bold text-white mb-1">{project.title}</h3>
                  <p className="text-gray-400 text-sm mb-3">{project.studio} • {project.genre}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-gray-300">
                      <Users className="w-4 h-4" />
                      {project.stats.players}
                    </span>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-4 h-4 fill-current" />
                      {project.stats.rating}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* All Projects */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-5 h-5 text-gray-500" />
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === cat 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games..."
                className="w-full md:w-64 pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedProject(project)}
                className="group rounded-xl overflow-hidden bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer"
              >
                <div className="aspect-video relative overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                    style={{ backgroundImage: `url(${project.thumbnail})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    {project.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-xs text-white/80">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">{project.studio}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-gray-400">
                        <Eye className="w-4 h-4" />
                        {project.stats.views}
                      </span>
                      <span className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-4 h-4 fill-current" />
                        {project.stats.rating}
                      </span>
                    </div>
                    <span className="text-gray-500">{project.releaseDate}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-16">
              <Gamepad2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">No projects found matching your criteria</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build Your Game?</h2>
          <p className="text-gray-400 mb-8">Join thousands of developers creating amazing games with Aethel Engine</p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold transition-all"
            >
              Start Free Today
            </Link>
            <Link
              href="/docs"
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all"
            >
              View Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedProject(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Header Image */}
              <div className="aspect-video relative">
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${selectedProject.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                
                <button
                  onClick={() => setSelectedProject(null)}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  ✕
                </button>

                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-2 mb-3">
                    {selectedProject.awards.map((award, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-xs text-yellow-400">
                        🏆 {award}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-4xl font-bold text-white mb-2">{selectedProject.title}</h2>
                  <p className="text-gray-300">{selectedProject.studio} • {selectedProject.genre}</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-300 mb-6 leading-relaxed">{selectedProject.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Users className="w-4 h-4" />
                      Players
                    </div>
                    <div className="text-xl font-bold text-white">{selectedProject.stats.players}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Star className="w-4 h-4" />
                      Rating
                    </div>
                    <div className="text-xl font-bold text-white">{selectedProject.stats.rating}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      Release
                    </div>
                    <div className="text-xl font-bold text-white">{selectedProject.releaseDate}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Globe className="w-4 h-4" />
                      Platforms
                    </div>
                    <div className="text-sm font-medium text-white">{selectedProject.platforms.join(', ')}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedProject.tags.map((tag, i) => (
                      <span key={i} className="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">
                      <Heart className="w-4 h-4" />
                      Save
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors">
                      <ExternalLink className="w-4 h-4" />
                      Visit Project
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
