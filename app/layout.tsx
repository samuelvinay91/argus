import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider, SignedIn } from '@clerk/nextjs';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { Providers } from '@/lib/providers';
import { SidebarProvider, MobileSidebar, MobileHeader } from '@/components/layout/sidebar';
import { MobileBottomNav } from '@/components/layout';
import { PWAInstallPrompt, PWAUpdatePrompt } from '@/components/pwa';
import { Toaster } from '@/components/ui/toaster';
import { CommandPalette } from '@/components/shared/CommandPalette';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://skopaq.ai'),
  title: {
    default: 'Skopaq | Agentic AI Quality Intelligence',
    template: '%s | Skopaq',
  },
  description: 'Autonomous AI agents that understand, test, heal, and report - without human intervention. Generate tests from production errors, predict bugs before they ship, and ship quality software faster.',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'android-chrome-192x192', url: '/android-chrome-192x192.png' },
      { rel: 'android-chrome-512x512', url: '/android-chrome-512x512.png' },
    ],
  },
  keywords: [
    'e2e testing',
    'ai testing',
    'automated testing',
    'qa automation',
    'skopaq',
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
  authors: [{ name: 'Skopaq Team', url: 'https://skopaq.ai' }],
  creator: 'Skopaq',
  publisher: 'Skopaq',
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Skopaq',
  },
  openGraph: {
    title: 'Skopaq | Agentic AI Quality Intelligence',
    description: 'Autonomous AI agents that understand, test, heal, and report. Generate tests from production errors. Predict bugs before they ship. Self-healing tests powered by Claude AI.',
    url: 'https://skopaq.ai',
    siteName: 'Skopaq',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Skopaq - Agentic AI Quality Intelligence',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Skopaq | Agentic AI Quality Intelligence',
    description: 'Autonomous AI agents that understand, test, heal, and report. Self-healing tests powered by Claude AI.',
    creator: '@skopaq',
    site: '@skopaq',
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
    canonical: 'https://skopaq.ai',
  },
  category: 'Technology',
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    // yandex: 'your-yandex-verification',
    // bing: 'your-bing-verification',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#f8fafc',
};

// JSON-LD structured data for rich snippets
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Skopaq',
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
  url: 'https://skopaq.ai',
  screenshot: 'https://skopaq.ai/og-image.png',
  author: {
    '@type': 'Organization',
    name: 'Skopaq',
    url: 'https://skopaq.ai',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Skopaq',
    logo: {
      '@type': 'ImageObject',
      url: 'https://skopaq.ai/skopaq-logo.png',
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
  name: 'Skopaq',
  url: 'https://skopaq.ai',
  logo: 'https://skopaq.ai/skopaq-logo.png',
  description:
    'Agentic AI quality intelligence for modern development teams',
  sameAs: [
    'https://twitter.com/skopaq',
    'https://github.com/skopaq',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Support',
    email: 'team@skopaq.ai',
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
          {/* TEMPORARY: Unregister broken service worker that causes SSE streams to fail.
              This is a static script (no user input) used for cleanup during the PWA fix. */}
          <script
            dangerouslySetInnerHTML={{
              __html: `if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(r){for(var i of r)i.unregister()})}`,
            }}
          />
          {/* ReB2B Analytics Tracking */}
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(key){if(window.reb2b)return;window.reb2b={loaded:true};var s=document.createElement("script");s.async=true;s.src="https://ddwl4m2hdecbv.cloudfront.net/b/"+key+"/"+key+".js.gz";document.getElementsByTagName("script")[0].parentNode.insertBefore(s,document.getElementsByTagName("script")[0]);}("4O7Z0HE8RXNX")`,
            }}
          />
          {/* Apollo.io Website Tracking */}
          <script
            dangerouslySetInnerHTML={{
              __html: `function initApollo(){var n=Math.random().toString(36).substring(7),o=document.createElement("script");o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n,o.async=!0,o.defer=!0,o.onload=function(){window.trackingFunctions.onLoad({appId:"698433f8b8d9480011c24307"})},document.head.appendChild(o)}initApollo();`,
            }}
          />
        </head>
        <body className={inter.className} suppressHydrationWarning>
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
          <GoogleAnalytics GA_MEASUREMENT_ID={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        </body>
      </html>
    </ClerkProvider>
  );
}
