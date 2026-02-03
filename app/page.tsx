import { LandingPage } from '@/components/landing/landing-page';

/**
 * Home page - Landing page for unauthenticated users
 *
 * Authenticated users are redirected to /dashboard by middleware
 * for faster server-side redirect (no client-side JS needed).
 */
export default function Home() {
  return <LandingPage />;
}
