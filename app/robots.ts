import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://skopaq.ai';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/sign-in',
          '/sign-up',
          '/legal',
          '/legal/terms',
          '/legal/privacy',
          '/legal/security',
          '/legal/gdpr',
          '/legal/licenses',
          '/accessibility',
          '/api-docs',
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
          '/profile/',
          '/team/',
          '/notifications/',
          '/onboarding/',
          '/schedules/',
          '/cicd/',
          '/integrations/',
          '/healing/',
          '/reports/',
          '/correlations/',
          '/performance/',
          '/security/',
          '/visual/',
          '/audit/',
          '/database/',
          '/orchestrator/',
          '/mcp-sessions/',
          '/live-dashboard/',
          '/invitations/',
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
