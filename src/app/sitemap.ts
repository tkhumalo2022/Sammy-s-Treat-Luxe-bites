import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/business'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date('2026-07-30'),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
