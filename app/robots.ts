import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://heyargus.ai';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/sign-in',
          '/sign-up',
        ],
        disallow: [
          '/api/',
          '/dashboard/',
          '/projects/',
          '/tests/',
          '/settings/',
          '/organizations/',
          '/chat/',
          '/quality/',
          '/intelligence/',
          '/infra/',
          '/insights/',
          '/activity/',
          '/flaky/',
          '/discovery/',
          '/parameterized/',
          '/api-keys/',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: ['/'],
      },
      {
        userAgent: 'Google-Extended',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
      {
        userAgent: 'anthropic-ai',
        disallow: ['/'],
      },
      {
        userAgent: 'Claude-Web',
        disallow: ['/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
