import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
    {
      url: 'https://aethel.dev/',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://aethel.dev/pricing',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://aethel.dev/contact-sales',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: 'https://aethel.dev/terms',
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ]
}
