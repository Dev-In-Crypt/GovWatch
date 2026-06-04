import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sign in — DAO Sentinel',
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  return (
    <>
      <Header />
      <main className="container-mc flex-1" style={{ paddingTop: 120, paddingBottom: 80, minHeight: 'calc(100vh - 200px)' }}>
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
