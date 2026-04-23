// apps/web/app/(auth)/login/page.tsx
'use client';

import { useState }    from 'react';
import { useRouter }   from 'next/navigation';
import { Mail, Lock, ArrowRight, Zap } from 'lucide-react';
import { useAuthStore } from '../../../stores/auth.store';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuthStore();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [focused,  setFocused]  = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Invalid credentials');
    }
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background layers */}
      <div className="absolute inset-0 bg-dots opacity-40" />
      <div className="absolute inset-0 bg-amber-radial" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-48 bg-gradient-to-b from-transparent via-amber/30 to-transparent" />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />

      <div className="relative w-full max-w-[400px] animate-fade-up">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="relative">
            <div className="w-10 h-10 bg-amber rounded-xl flex items-center justify-center shadow-amber animate-pulse-glow">
              <Zap className="w-5 h-5 text-void" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-slate-full font-display tracking-tight">AOLD</span>
            <p className="text-[10px] text-slate-mid tracking-[0.2em] uppercase">Personal Data OS</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8 shadow-void border border-void-400/50">

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-full font-display mb-2">
              Welcome back
            </h1>
            <p className="text-slate-mid text-sm">Sign in to your intelligence layer</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-mid tracking-[0.15em] uppercase">
                Email
              </label>
              <div className={`relative transition-all duration-200 ${focused === 'email' ? 'scale-[1.01]' : ''}`}>
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-dim" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-void-200/50 border border-void-400 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-slate-bright placeholder:text-slate-dim/50 focus:outline-none focus:border-amber/60 focus:bg-void-200 focus:shadow-glow-amber transition-all duration-200"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-mid tracking-[0.15em] uppercase">
                Password
              </label>
              <div className={`relative transition-all duration-200 ${focused === 'password' ? 'scale-[1.01]' : ''}`}>
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-dim" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••••"
                  required
                  className="w-full bg-void-200/50 border border-void-400 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-slate-bright placeholder:text-slate-dim/50 focus:outline-none focus:border-amber/60 focus:bg-void-200 focus:shadow-glow-amber transition-all duration-200"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-rose/10 border border-rose/20 rounded-2xl px-4 py-3 animate-fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-rose flex-shrink-0" />
                <p className="text-xs text-rose">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 relative group overflow-hidden bg-amber hover:bg-amber-glow text-void font-semibold py-4 rounded-2xl transition-all duration-200 shadow-amber hover:shadow-amber disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              <span className="relative flex items-center justify-center gap-2 text-sm">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 ease-in-out" />
            </button>
          </form>

          <p className="text-center text-sm text-slate-dim mt-6">
            No account?{' '}
            <Link href="/register" className="text-amber hover:text-amber-glow font-medium transition-colors">
              Create one →
            </Link>
          </p>
        </div>

        {/* Bottom note */}
        <p className="text-center text-xs text-slate-dim/60 mt-6">
          Your data stays yours. Always encrypted, never shared.
        </p>
      </div>
    </div>
  );
}