// apps/web/tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep navy base
        void:    { DEFAULT: '#080C14', 50: '#0D1420', 100: '#111B2E', 200: '#162238', 300: '#1C2D47' },
        // Warm amber accent
        amber:   { DEFAULT: '#F59E0B', dim: '#B45309', glow: '#FCD34D' },
        // Soft slate for text
        slate:   { dim: '#64748B', mid: '#94A3B8', bright: '#CBD5E1', full: '#F1F5F9' },
        // Status
        emerald: { DEFAULT: '#10B981', dim: '#065F46' },
        rose:    { DEFAULT: '#F43F5E', dim: '#881337' },
      },
      fontFamily: {
        sans:  ['var(--font-syne)', 'sans-serif'],
        mono:  ['var(--font-jetbrains)', 'monospace'],
        display: ['var(--font-clash)', 'sans-serif'],
      },
      backgroundImage: {
        'grid-void': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M0 0h1v40H0zM40 0h1v40H0zM0 0v1h40V0zM0 40v1h40V0z' fill='%23162238' opacity='.4'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-up':   'fadeUp 0.4s ease forwards',
        'fade-in':   'fadeIn 0.3s ease forwards',
        'shimmer':   'shimmer 1.5s infinite',
        'pulse-glow':'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:    { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 0px #F59E0B33' }, '50%': { boxShadow: '0 0 20px #F59E0B66' } },
      },
      boxShadow: {
        'void':  '0 4px 32px rgba(0,0,0,0.6)',
        'amber': '0 0 24px rgba(245,158,11,0.3)',
        'card':  '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};