import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider, SignedIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
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
  themeColor: '#6366F1',
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
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
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
        baseTheme: dark,
        variables: {
          colorPrimary: '#14b8a6',
          colorBackground: '#0c1222',
          colorText: '#f1f5f9',
          colorTextSecondary: '#94a3b8',
          colorInputBackground: '#162032',
          colorInputText: '#f1f5f9',
        },
        elements: {
          card: 'bg-card border border-border',
          formButtonPrimary: 'bg-primary hover:opacity-90',
          footerActionLink: 'text-primary hover:text-primary/80',
        },
      }}
    >
      <html lang="en" className="dark">
        <body className={inter.className}>
          <Providers>
            <SidebarProvider>
              <div className="min-h-screen bg-background">
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
