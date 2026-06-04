'use client';
import Link from 'next/link';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginForm() {
  const sp = useSearchParams();
  const verify = sp.get('verify');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (verify) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Check your inbox</CardTitle>
            <CardDescription>
              We sent a magic link to your email. Open it on this device to sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Didn&apos;t get it? Check your spam folder, or{' '}
              <Link href="/login" className="text-[hsl(var(--indigo-bright))] hover:underline">
                try a different email
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to DAO Sentinel</CardTitle>
          <CardDescription>We&apos;ll email you a magic link — no password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email) return;
              setSubmitting(true);
              signIn('resend', { email, callbackUrl: '/dashboard' });
            }}
          >
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={submitting || !email}>
              {submitting ? 'Sending…' : 'Email me a magic link'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Don&apos;t want to sign in?{' '}
            <Link href="/" className="text-[hsl(var(--indigo-bright))] hover:underline">
              Back to home
            </Link>
            {' · '}
            <Link href="/daos" className="text-[hsl(var(--indigo-bright))] hover:underline">
              Browse DAOs
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
