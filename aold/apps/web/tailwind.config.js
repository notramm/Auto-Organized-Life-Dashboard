// apps/web/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './stores/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        void:    {
          DEFAULT: '#080C14',
          50:  '#0A0F1A',
          100: '#0D1420',
          200: '#111B2E',
          300: '#162238',
          400: '#1C2D47',
          500: '#243659',
        },
        amber:   {
          DEFAULT: '#F59E0B',
          dim:     '#92610A',
          glow:    '#FCD34D',
          muted:   '#78490A',
        },
        slate:   {
          dim:    '#475569',
          mid:    '#64748B',
          base:   '#94A3B8',
          bright: '#CBD5E1',
          full:   '#F1F5F9',
        },
        emerald: { DEFAULT: '#10B981', dim: '#059669', glow: '#34D399' },
        rose:    { DEFAULT: '#F43F5E', dim: '#E11D48', muted: '#881337' },
        blue:    { DEFAULT: '#3B82F6', dim: '#2563EB', glow: '#60A5FA' },
      },
      fontFamily: {
        sans:    ['var(--font-sans)', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
        display: ['var(--font-display)', 'sans-serif'],
      },
      backgroundImage: {
        'grid-void':    "url(\"data:image/svg+xml,%3Csvg width='32' height='32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h32v32H0z' fill='none'/%3E%3Cpath d='M0 0v32M32 0v32M0 0h32M0 32h32' stroke='%23162238' stroke-width='0.5' opacity='0.6'/%3E%3C/svg%3E\")",
        'noise':        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
        'amber-radial': 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.12) 0%, transparent 70%)',
        'void-gradient':'linear-gradient(180deg, #0A0F1A 0%, #080C14 100%)',
      },
      animation: {
        'fade-up':      'fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards',
        'fade-in':      'fadeIn 0.3s ease forwards',
        'fade-down':    'fadeDown 0.4s cubic-bezier(0.22,1,0.36,1) forwards',
        'scale-in':     'scaleIn 0.3s cubic-bezier(0.22,1,0.36,1) forwards',
        'shimmer':      'shimmer 2s linear infinite',
        'pulse-glow':   'pulseGlow 3s ease-in-out infinite',
        'slide-right':  'slideRight 0.4s cubic-bezier(0.22,1,0.36,1) forwards',
        'float':        'float 6s ease-in-out infinite',
        'spin-slow':    'spin 8s linear infinite',
      },
      keyframes: {
        fadeUp:    { '0%': { opacity:'0', transform:'translateY(16px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        fadeIn:    { '0%': { opacity:'0' }, '100%': { opacity:'1' } },
        fadeDown:  { '0%': { opacity:'0', transform:'translateY(-10px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        scaleIn:   { '0%': { opacity:'0', transform:'scale(0.95)' }, '100%': { opacity:'1', transform:'scale(1)' } },
        shimmer:   { '0%': { backgroundPosition:'-200% 0' }, '100%': { backgroundPosition:'200% 0' } },
        pulseGlow: { '0%,100%': { boxShadow:'0 0 0px rgba(245,158,11,0)' }, '50%': { boxShadow:'0 0 32px rgba(245,158,11,0.25)' } },
        slideRight:{ '0%': { opacity:'0', transform:'translateX(-16px)' }, '100%': { opacity:'1', transform:'translateX(0)' } },
        float:     { '0%,100%': { transform:'translateY(0px)' }, '50%': { transform:'translateY(-8px)' } },
      },
      boxShadow: {
        'void':    '0 8px 48px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)',
        'void-sm': '0 2px 16px rgba(0,0,0,0.5)',
        'amber':   '0 0 32px rgba(245,158,11,0.25), 0 0 8px rgba(245,158,11,0.15)',
        'amber-sm':'0 0 12px rgba(245,158,11,0.2)',
        'card':    '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.4)',
        'card-hover': '0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 48px rgba(0,0,0,0.5)',
        'glow-amber': '0 0 0 1px rgba(245,158,11,0.3), 0 0 32px rgba(245,158,11,0.15)',
        'glow-emerald':'0 0 0 1px rgba(16,185,129,0.3), 0 0 24px rgba(16,185,129,0.1)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
};