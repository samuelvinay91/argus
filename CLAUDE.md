# Skopaq Dashboard

## Project Overview

Next.js 15 dashboard for **Skopaq** — an autonomous E2E full-stack testing platform. This is the web UI where users manage test runs, view results, configure integrations, and interact with AI agents.

**Production URL**: `https://app.skopaq.ai`
**Backend API**: `https://api.skopaq.ai`

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Auth**: Clerk (`@clerk/nextjs`) — custom domain `accounts.skopaq.ai`
- **Styling**: Tailwind CSS + Radix UI primitives
- **State**: React Context + SWR for data fetching
- **Testing**: Vitest (unit/integration) + Playwright (E2E)
- **AI**: Vercel AI SDK (`@ai-sdk/anthropic`, `@ai-sdk/react`)
- **3D/Animations**: React Three Fiber, Spline
- **Monitoring**: Sentry (`@sentry/nextjs`)
- **Deployment**: Vercel (Pro plan)

## Directory Structure

```
dashboard/
├── app/                    # Next.js App Router pages
│   ├── (app)/              # Authenticated app routes
│   ├── (dashboard)/        # Dashboard layout group
│   ├── api/                # API routes (Next.js)
│   ├── auth/               # Sign-in/sign-up pages
│   ├── chat/               # AI chat interface
│   ├── cicd/               # CI/CD pipeline views
│   ├── settings/           # User/org settings
│   └── ...                 # Feature-specific routes
├── components/             # React components (by feature)
│   ├── landing/            # Marketing/landing page
│   ├── layout/             # Sidebar, header, footer
│   ├── chat/               # Chat UI components
│   ├── dashboard/          # Dashboard widgets
│   └── ui/                 # Shared UI primitives
├── lib/                    # Utilities and configuration
│   ├── api-client.ts       # Backend API client
│   ├── api.ts              # API helpers
│   ├── config/             # App configuration
│   ├── hooks/              # Custom React hooks
│   ├── supabase/           # Supabase client
│   └── version.ts          # App version/name
├── public/                 # Static assets
│   └── manifest.json       # PWA manifest
├── __tests__/              # Test files
│   ├── components/         # Component tests
│   ├── integration/        # Integration tests
│   ├── lib/                # Utility tests
│   └── pages/              # Page tests
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind configuration
└── tsconfig.json           # TypeScript configuration
```

## Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint

# Testing
npm run test             # Vitest (unit tests)
npm run test:watch       # Vitest watch mode
npm run test:coverage    # Vitest with coverage
npm run test:integration # Integration tests
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright with UI
```

## Key Patterns

### Authentication
All authenticated routes use Clerk middleware. The auth flow:
- Sign in/up via Clerk components at `/sign-in`, `/sign-up`
- Clerk custom domain: `accounts.skopaq.ai`
- Social providers: GitHub, Google
- After auth redirect: `/dashboard`

### API Communication
- Backend API client in `lib/api-client.ts`
- Backend URL configured via `NEXT_PUBLIC_BACKEND_URL` env var
- API calls include Clerk JWT token in Authorization header
- Supabase used for real-time subscriptions

### Component Organization
- Feature components grouped by domain (chat, dashboard, analytics, etc.)
- Shared UI primitives in `components/ui/` (Radix-based)
- Layout components in `components/layout/`

### Content Security Policy
CSP headers are configured in `next.config.ts`. When adding new external resources (scripts, fonts, APIs), update the CSP directives accordingly.

## Environment Variables

```bash
# Required
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_BACKEND_URL=https://api.skopaq.ai
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding

# Optional
SENTRY_DSN=...
NEXT_PUBLIC_CLOUDFLARE_WORKER_URL=https://skopaq-api.samuelvinay-kumar.workers.dev
```

## Branding

- **Internal identifiers** use `argus` (CSS vars `--argus-*`, localStorage keys `argus_*`) — do NOT rename these
- **User-facing text** uses "Skopaq" — always use this in UI copy, SEO, emails
- **Domain**: `skopaq.ai` (not `heyargus.ai`)

## Important Constraints

1. **Never hardcode API URLs** — use env vars or `lib/config/`
2. **Always use Clerk hooks** (`useAuth`, `useUser`) for auth — never raw JWT handling
3. **CSP compliance** — new external resources must be added to CSP headers in `next.config.ts`
4. **Accessibility** — use Radix primitives for interactive elements
5. **No direct Supabase writes** — all mutations go through the backend API
