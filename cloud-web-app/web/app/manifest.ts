/**
 * PWA Manifest for Aethel Engine
 * 
 * Enables "Install as App" functionality in browsers.
 * Required for standalone desktop-like experience.
 */

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aethel Engine',
    short_name: 'Aethel',
    description: 'Plataforma profissional para criação de jogos e filmes - Crie experiências AAA direto no navegador',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#6366f1',
    orientation: 'landscape',
    categories: ['games', 'productivity', 'developer tools'],
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/editor.png',
        sizes: '1920x1080',
        type: 'image/png',
      },
      {
        src: '/screenshots/dashboard.png',
        sizes: '1920x1080',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Novo projeto',
        short_name: 'Novo',
        description: 'Crie um novo projeto de jogo ou filme',
        url: '/dashboard?action=new',
        icons: [{ src: '/icons/shortcut-new.png', sizes: '96x96' }],
      },
      {
        name: 'Meus projetos',
        short_name: 'Projetos',
        description: 'Veja seus projetos existentes',
        url: '/dashboard',
        icons: [{ src: '/icons/shortcut-projects.png', sizes: '96x96' }],
      },
      {
        name: 'Assistente de IA',
        short_name: 'IA',
        description: 'Abrir central de comandos da IA',
        url: '/ai-command',
        icons: [{ src: '/icons/shortcut-ai.png', sizes: '96x96' }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
    scope: '/',
    lang: 'pt-BR',
    dir: 'ltr',
  };
}
