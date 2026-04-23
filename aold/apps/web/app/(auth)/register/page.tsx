// apps/web/app/(auth)/register/page.tsx
'use client';

import { useState }    from 'react';
import { useRouter }   from 'next/navigation';
import { Mail, Lock, User, ArrowRight, Zap, Check } from 'lucide-react';
import { useAuthStore } from '../../../stores/auth.store';
import Link from 'next/link';

const PASSWORD_RULES = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [focused,  setFocused]  = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await register(email, password, fullName);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Registration failed');
    }
  }

  const passRules = PASSWORD_RULES.map(r => ({ ...r, passed: r.test(password) }));
  const allPassed = passRules.every(r => r.passed);

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-dots opacity-40" />
      <div className="absolute inset-0 bg-amber-radial" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-emerald/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/3 left-1/4 w-56 h-56 bg-amber/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="relative w-full max-w-[400px] animate-fade-up">

        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-amber rounded-xl flex items-center justify-center shadow-amber animate-pulse-glow">
            <Zap className="w-5 h-5 text-void" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-xl font-bold text-slate-full font-display tracking-tight">AOLD</span>
            <p className="text-[10px] text-slate-mid tracking-[0.2em] uppercase">Personal Data OS</p>
          </div>
        </div>

        <div className="glass rounded-3xl p-8 shadow-void border border-void-400/50">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-full font-display mb-2">
              Create account
            </h1>
            <p className="text-slate-mid text-sm">Your AI-powered data OS awaits</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-mid tracking-[0.15em] uppercase">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-dim" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  placeholder="Ram Sharma"
                  required
                  className="w-full bg-void-200/50 border border-void-400 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-slate-bright placeholder:text-slate-dim/50 focus:outline-none focus:border-amber/60 focus:bg-void-200 transition-all duration-200"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-mid tracking-[0.15em] uppercase">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-dim" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-void-200/50 border border-void-400 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-slate-bright placeholder:text-slate-dim/50 focus:outline-none focus:border-amber/60 focus:bg-void-200 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-mid tracking-[0.15em] uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-dim" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setShowRules(true); }}
                  placeholder="Create a strong password"
                  required
                  className="w-full bg-void-200/50 border border-void-400 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-slate-bright placeholder:text-slate-dim/50 focus:outline-none focus:border-amber/60 focus:bg-void-200 transition-all duration-200"
                />
              </div>
              {/* Password strength */}
              {showRules && password.length > 0 && (
                <div className="flex gap-2 pt-1 animate-fade-in">
                  {passRules.map((rule) => (
                    <div key={rule.label} className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full transition-colors ${rule.passed ? 'bg-emerald' : 'bg-void-400'}`} />
                      <span className={`text-[10px] transition-colors ${rule.passed ? 'text-emerald' : 'text-slate-dim'}`}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-rose/10 border border-rose/20 rounded-2xl px-4 py-3 animate-fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-rose flex-shrink-0" />
                <p className="text-xs text-rose">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !allPassed}
              className="w-full mt-2 relative group overflow-hidden bg-amber hover:bg-amber-glow text-void font-semibold py-4 rounded-2xl transition-all duration-200 shadow-amber hover:shadow-amber disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              <span className="relative flex items-center justify-center gap-2 text-sm">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />Creating account...</>
                ) : (
                  <>Create Account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                )}
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500" />
            </button>
          </form>

          <p className="text-center text-sm text-slate-dim mt-6">
            Already have one?{' '}
            <Link href="/login" className="text-amber hover:text-amber-glow font-medium transition-colors">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}