import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Rocket, Code, Zap, Shield, Globe, Users, Star, ArrowRight,
  CheckCircle, Play, Github, Twitter, Sparkles, Cpu, Layers,
  Terminal, GitBranch, Palette, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LandingPage = () => {
  const features = [
    {
      icon: Code,
      title: 'Monaco Editor',
      description: 'The same editor that powers VS Code, with IntelliSense and syntax highlighting for 50+ languages.'
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Coding',
      description: 'Get intelligent code suggestions, explanations, and automated refactoring powered by advanced AI.'
    },
    {
      icon: Terminal,
      title: 'Integrated Terminal',
      description: 'Full-featured terminal with command history, multiple sessions, and seamless integration.'
    },
    {
      icon: GitBranch,
      title: 'Git Integration',
      description: 'Built-in source control with visual diff, branch management, and commit history.'
    },
    {
      icon: Globe,
      title: 'Live Preview',
      description: 'See your changes instantly with hot reload and responsive preview for any device.'
    },
    {
      icon: Layers,
      title: 'Animation Tools',
      description: 'Professional timeline editor for creating smooth animations with keyframes and curves.'
    }
  ];

  const stats = [
    { value: '50K+', label: 'Developers' },
    { value: '1M+', label: 'Projects' },
    { value: '99.9%', label: 'Uptime' },
    { value: '150ms', label: 'Avg Response' }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Senior Developer at Stripe',
      avatar: 'S',
      content: 'This IDE has completely transformed my workflow. The AI assistance is incredibly accurate and the performance is unmatched.'
    },
    {
      name: 'Marcus Johnson',
      role: 'Tech Lead at Vercel',
      avatar: 'M',
      content: 'Finally, a cloud IDE that feels as fast as a native app. The collaboration features are game-changing for our remote team.'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Founder at DevTools Inc',
      avatar: 'E',
      content: 'The animation timeline and profiling tools put this in a league of its own. Perfect for building complex web applications.'
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">AI IDE</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/#features" className="text-zinc-400 hover:text-white transition-colors">Features</Link>
            <Link to="/pricing" className="text-zinc-400 hover:text-white transition-colors">Pricing</Link>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Docs</a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Blog</a>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-zinc-300">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button className="bg-blue-600 hover:bg-blue-700">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-400">Now with GPT-4 powered AI assistance</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              The IDE that
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"> thinks </span>
              with you
            </h1>
            
            <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
              A professional cloud IDE with AI-powered code completion, real-time collaboration, 
              animation tools, and everything you need to build amazing software.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 h-14 px-8 text-lg">
                  Start Building Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-zinc-700 hover:bg-zinc-800">
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
              </Button>
            </div>
            
            <p className="text-sm text-zinc-600 mt-6">No credit card required • Free tier available</p>
          </div>
          
          {/* IDE Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800 border-b border-zinc-700">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-sm text-zinc-500 ml-4">AI IDE Platform</span>
              </div>
              <div className="h-[500px] bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center">
                <div className="text-center">
                  <Code className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-600">Interactive demo loading...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-zinc-500 mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need to build</h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Professional-grade tools that help you write better code, faster.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors group">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-zinc-950 via-blue-950/10 to-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-400">AI-Powered</span>
              </div>
              <h2 className="text-4xl font-bold mb-6">Code faster with AI that understands your project</h2>
              <p className="text-lg text-zinc-400 mb-8">
                Our AI assistant understands your entire codebase, suggests improvements, 
                explains complex code, and helps you debug issues in seconds.
              </p>
              <ul className="space-y-4">
                {[
                  'Intelligent code completion',
                  'Natural language to code',
                  'Automated refactoring',
                  'Bug detection and fixes',
                  'Documentation generation'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <div className="space-y-4">
                <div className="bg-zinc-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs">U</div>
                    <span className="text-sm text-zinc-400">You</span>
                  </div>
                  <p className="text-sm">Explain this function and suggest improvements</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-3 h-3" />
                    </div>
                    <span className="text-sm text-zinc-400">AI Assistant</span>
                  </div>
                  <p className="text-sm text-zinc-300">
                    This function processes user data and returns a formatted result. 
                    Here are some suggestions to improve it:
                    <br /><br />
                    1. Add input validation<br />
                    2. Use async/await for better readability<br />
                    3. Add error handling with try/catch
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Loved by developers</h2>
            <p className="text-xl text-zinc-400">Join thousands of developers building with AI IDE</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-zinc-300 mb-6">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center font-medium">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-medium">{testimonial.name}</div>
                    <div className="text-sm text-zinc-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to build something amazing?
          </h2>
          <p className="text-xl text-zinc-400 mb-10">
            Join 50,000+ developers who are already building faster with AI IDE.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 h-14 px-8 text-lg">
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-zinc-700 hover:bg-zinc-800">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">AI IDE</span>
              </Link>
              <p className="text-zinc-500 mb-4">The most powerful cloud IDE for modern developers.</p>
              <div className="flex gap-4">
                <a href="#" className="text-zinc-500 hover:text-white"><Github className="w-5 h-5" /></a>
                <a href="#" className="text-zinc-500 hover:text-white"><Twitter className="w-5 h-5" /></a>
              </div>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
              { title: 'Resources', links: ['Documentation', 'Tutorials', 'Blog', 'Community'] },
              { title: 'Company', links: ['About', 'Careers', 'Contact', 'Legal'] }
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-medium mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className="text-zinc-500 hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-zinc-500 text-sm">© 2024 AI IDE Platform. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-zinc-500">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
