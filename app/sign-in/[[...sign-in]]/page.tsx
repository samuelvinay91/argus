'use client';

import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Back to home link */}
      <div className="w-full max-w-md mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to home
        </Link>
      </div>

      {/* Sign-in component */}
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/"
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md',
            card: 'w-full shadow-2xl',
          },
        }}
      />

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          By signing in, you agree to our{' '}
          <Link href="/legal/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
