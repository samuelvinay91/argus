import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider, SignedIn } from '@clerk/nextjs';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Providers } from '@/lib/providers';
import { SidebarProvider, MobileSidebar, MobileHeader } from '@/components/layout/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { CommandPalette } from '@/components/shared/CommandPalette';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://heyargus.ai'),
  title: 'Argus | AI-Powered E2E Testing',
  description: 'Hey Argus - Your AI testing companion. Generate tests from production errors, predict bugs before they ship, and ship quality software faster.',
  keywords: ['e2e testing', 'ai testing', 'automated testing', 'qa automation', 'argus', 'test generation', 'self-healing tests'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Argus',
  },
  openGraph: {
    title: 'Argus | AI-Powered E2E Testing',
    description: 'Generate tests from production errors. Predict bugs before they ship. Self-healing tests that adapt to your UI.',
    url: 'https://heyargus.ai',
    siteName: 'Argus',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Argus - AI-Powered E2E Testing',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Argus | AI-Powered E2E Testing',
    description: 'Generate tests from production errors. Predict bugs before they ship.',
    creator: '@heyargus',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6366F1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#14b8a6',
          colorBackground: '#000000',
          colorText: '#ededed',
          colorTextSecondary: '#888888',
          colorInputBackground: '#111111',
          colorInputText: '#ededed',
        },
        elements: {
          card: 'bg-[#0a0a0a] border border-[#222] shadow-2xl',
          formButtonPrimary: 'bg-primary hover:opacity-90',
          footerActionLink: 'text-primary hover:text-primary/80',
        },
      }}
    >
      <html lang="en" className="dark">
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
                  <CommandPalette />
                </SignedIn>
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
