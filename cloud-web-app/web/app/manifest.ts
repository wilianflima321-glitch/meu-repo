/**
 * PWA Manifest for Aethel Engine.
 *
 * Enables installable app behavior for desktop-like usage in browsers.
 */

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aethel Engine',
    short_name: 'Aethel',
    description: 'Professional platform for building games, films, and apps in a unified web-native studio.',
    start_url: '/ide',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#2563eb',
    orientation: 'landscape',
    categories: ['games', 'productivity', 'developer tools'],
    icons: [
      { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
    screenshots: [
      { src: '/screenshots/editor.png', sizes: '1920x1080', type: 'image/png' },
      { src: '/screenshots/dashboard.png', sizes: '1920x1080', type: 'image/png' },
    ],
    shortcuts: [
      {
        name: 'New project',
        short_name: 'New',
        description: 'Create a new game, film, or app project.',
        url: '/ide?entry=explorer',
        icons: [{ src: '/icons/shortcut-new.png', sizes: '96x96' }],
      },
      {
        name: 'My projects',
        short_name: 'Projects',
        description: 'Open existing projects and continue editing.',
        url: '/ide?entry=explorer',
        icons: [{ src: '/icons/shortcut-projects.png', sizes: '96x96' }],
      },
      {
        name: 'AI command center',
        short_name: 'AI',
        description: 'Open the AI command center.',
        url: '/ide?entry=ai',
        icons: [{ src: '/icons/shortcut-ai.png', sizes: '96x96' }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
    scope: '/',
    lang: 'en-US',
    dir: 'ltr',
  };
}
