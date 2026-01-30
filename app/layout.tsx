import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider, SignedIn } from '@clerk/nextjs';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Providers } from '@/lib/providers';
import { SidebarProvider, MobileSidebar, MobileHeader } from '@/components/layout/sidebar';
import { MobileBottomNav } from '@/components/layout';
import { PWAInstallPrompt, PWAUpdatePrompt } from '@/components/pwa';
import { Toaster } from '@/components/ui/toaster';
import { CommandPalette } from '@/components/shared/CommandPalette';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://heyargus.ai'),
  title: {
    default: 'Argus | Agentic AI Quality Intelligence',
    template: '%s | Argus',
  },
  description: 'Autonomous AI agents that understand, test, heal, and report - without human intervention. Generate tests from production errors, predict bugs before they ship, and ship quality software faster.',
  keywords: [
    'e2e testing',
    'ai testing',
    'automated testing',
    'qa automation',
    'argus',
    'test generation',
    'self-healing tests',
    'end-to-end testing',
    'test automation platform',
    'ai-powered testing',
    'production error testing',
    'bug prediction',
    'quality assurance',
    'continuous testing',
    'playwright',
    'selenium',
    'cypress alternative',
    'test orchestration',
    'autonomous testing',
  ],
  authors: [{ name: 'Argus Team', url: 'https://heyargus.ai' }],
  creator: 'Argus',
  publisher: 'Argus',
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Argus',
  },
  openGraph: {
    title: 'Argus | Agentic AI Quality Intelligence',
    description: 'Autonomous AI agents that understand, test, heal, and report. Generate tests from production errors. Predict bugs before they ship. Self-healing tests powered by Claude AI.',
    url: 'https://heyargus.ai',
    siteName: 'Argus',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Argus - Agentic AI Quality Intelligence',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Argus | Agentic AI Quality Intelligence',
    description: 'Autonomous AI agents that understand, test, heal, and report. Self-healing tests powered by Claude AI.',
    creator: '@heyargus',
    site: '@heyargus',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://heyargus.ai',
  },
  category: 'Technology',
  verification: {
    // Add when you have these
    // google: 'your-google-site-verification',
    // yandex: 'your-yandex-verification',
    // bing: 'your-bing-verification',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f8fafc',
};

// JSON-LD structured data for rich snippets
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Argus',
  applicationCategory: 'DeveloperApplication',
  applicationSubCategory: 'Testing Tools',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '127',
  },
  description:
    'Autonomous AI agents that understand, test, heal, and report - without human intervention. Self-healing tests that generate from production errors.',
  url: 'https://heyargus.ai',
  screenshot: 'https://heyargus.ai/og-image.png',
  author: {
    '@type': 'Organization',
    name: 'Argus',
    url: 'https://heyargus.ai',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Argus',
    logo: {
      '@type': 'ImageObject',
      url: 'https://heyargus.ai/argus-logo.png',
    },
  },
  featureList: [
    'AI-powered test generation',
    'Self-healing tests',
    'Production error tracking',
    'Bug prediction',
    'Multi-framework support (Playwright, Selenium, Cypress)',
    'Claude AI integration',
    'Automated UI testing',
    'API testing',
    'Database validation',
  ],
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Argus',
  url: 'https://heyargus.ai',
  logo: 'https://heyargus.ai/argus-logo.png',
  description:
    'Agentic AI quality intelligence for modern development teams',
  sameAs: [
    'https://twitter.com/heyargus',
    'https://github.com/argus-labs',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Support',
    email: 'team@heyargus.com',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined, // Let it detect from system
        variables: {
          colorPrimary: 'hsl(173, 80%, 40%)',
          colorDanger: 'hsl(0, 72%, 51%)',
        },
        elements: {
          card: 'bg-card border border-border shadow-xl',
          formButtonPrimary: 'bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors',
          formButtonReset: 'bg-transparent text-muted-foreground hover:text-foreground transition-colors',
          footerActionLink: 'text-primary hover:text-primary/80',
          identityPreviewText: 'text-foreground',
          identityPreviewEditButton: 'text-primary hover:text-primary/80',
          formFieldInput: 'bg-background border-border text-foreground focus:border-primary focus:ring-primary',
          formFieldLabel: 'text-muted-foreground',
          dividerLine: 'bg-border',
          dividerText: 'text-muted-foreground',
          socialButtonsBlockButton: 'bg-muted border-border text-foreground hover:bg-muted/80 transition-colors',
          socialButtonsBlockButtonText: 'text-foreground font-medium',
          otpCodeFieldInput: 'bg-background border-border text-foreground',
          alertText: 'text-foreground',
          headerTitle: 'text-foreground',
          headerSubtitle: 'text-muted-foreground',
          userButtonPopoverCard: 'bg-card border border-border',
          userButtonPopoverActionButton: 'text-foreground hover:bg-muted transition-colors',
          userButtonPopoverActionButtonText: 'text-foreground',
          userButtonPopoverActionButtonIcon: 'text-muted-foreground',
          userButtonPopoverFooter: 'border-t border-border',
          userPreviewMainIdentifier: 'text-foreground',
          userPreviewSecondaryIdentifier: 'text-muted-foreground',
          menuButton: 'text-foreground hover:bg-muted',
          menuItem: 'text-foreground hover:bg-muted',
          menuList: 'bg-card border border-border',
          navbar: 'bg-card border-b border-border',
          navbarButton: 'text-foreground hover:bg-muted',
          profileSection: 'border-b border-border',
          profileSectionTitle: 'text-muted-foreground',
          profileSectionContent: 'text-foreground',
          accordionTriggerButton: 'text-foreground hover:bg-muted',
          accordionContent: 'text-foreground',
          breadcrumbs: 'text-muted-foreground',
          breadcrumbsItem: 'text-foreground',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Structured Data for Rich Snippets */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
          />
        </head>
        <body className={inter.className}>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Providers>
            <SidebarProvider>
              <div id="main-content" className="min-h-screen bg-background">
                <MobileHeader />
                <MobileSidebar />
                {children}
                <SignedIn>
                  <MobileBottomNav />
                  <CommandPalette />
                  <PWAInstallPrompt />
                </SignedIn>
                <PWAUpdatePrompt />
                <Toaster />
              </div>
            </SidebarProvider>
          </Providers>
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
