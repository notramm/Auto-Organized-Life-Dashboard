// apps/web/src/app/(auth)/login/page.tsx

'use client';
import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Zap } from 'lucide-react';
import { useAuthStore } from '../../../stores/auth.store';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as any).response?.data?.error?.message;

      setError(message ?? 'Login failed');
    }
  }

  return (
    <div className="min-h-screen bg-void bg-grid-void flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-amber rounded-lg flex items-center justify-center shadow-amber">
            <Zap className="w-4 h-4 text-void" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-slate-full tracking-tight">AOLD</span>
        </div>

        <div className="bg-void-50/80 backdrop-blur-md border border-void-300 rounded-2xl p-8 shadow-void">
          <h1 className="text-2xl font-bold text-slate-full mb-1">Welcome back</h1>
          <p className="text-sm text-slate-dim mb-8">Sign in to your data OS</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              required
            />

            {error && (
              <div className="text-xs text-rose bg-rose/10 border border-rose/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-slate-dim mt-6">
            No account?{' '}
            <Link href="/register" className="text-amber hover:text-amber-glow transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
