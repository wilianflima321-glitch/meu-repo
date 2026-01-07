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
    description: 'Professional Game & Film Creation Platform - Create AAA-quality games and films in your browser',
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
        form_factor: 'wide',
        label: 'Aethel Engine Editor',
      },
      {
        src: '/screenshots/dashboard.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Project Dashboard',
      },
    ],
    shortcuts: [
      {
        name: 'New Project',
        short_name: 'New',
        description: 'Create a new game or film project',
        url: '/dashboard?action=new',
        icons: [{ src: '/icons/shortcut-new.png', sizes: '96x96' }],
      },
      {
        name: 'My Projects',
        short_name: 'Projects',
        description: 'View your existing projects',
        url: '/dashboard',
        icons: [{ src: '/icons/shortcut-projects.png', sizes: '96x96' }],
      },
      {
        name: 'AI Assistant',
        short_name: 'AI',
        description: 'Open AI Command Center',
        url: '/ai-command',
        icons: [{ src: '/icons/shortcut-ai.png', sizes: '96x96' }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
    scope: '/',
    lang: 'en',
    dir: 'ltr',
  };
}
