import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/'],
      disallow: ['/admin', '/api', '/dashboard', '/ide'],
    },
    sitemap: 'https://aethel.dev/sitemap.xml',
    host: 'https://aethel.dev',
  }
}
