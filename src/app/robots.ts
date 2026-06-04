import type { MetadataRoute } from 'next';

const BASE = process.env.NEXTAUTH_URL || 'https://www.daosentinel.xyz';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/settings', '/login'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
