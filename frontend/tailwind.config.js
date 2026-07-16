/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
        },
        neon: {
          cyan:    '#22d3ee',
          cyanHi:  '#67e8f9',
          violet:  '#a78bfa',
          pink:    '#f472b6',
          lime:    '#a3e635',
          amber:   '#fbbf24',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'neon-cyan':   '0 0 0 1px rgba(34,211,238,0.35), 0 0 24px -4px rgba(34,211,238,0.6)',
        'neon-violet': '0 0 0 1px rgba(167,139,250,0.35), 0 0 24px -4px rgba(167,139,250,0.6)',
        'neon-pink':   '0 0 0 1px rgba(244,114,182,0.35), 0 0 24px -4px rgba(244,114,182,0.6)',
        'neon-lime':   '0 0 0 1px rgba(163,230,53,0.35), 0 0 24px -4px rgba(163,230,53,0.6)',
        'card':        '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        'grid': 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        'radial-cyan':   'radial-gradient(600px 300px at 10% -10%, rgba(34,211,238,0.22), transparent 55%)',
        'radial-pink':   'radial-gradient(600px 300px at 110% 10%, rgba(244,114,182,0.18), transparent 55%)',
        'radial-violet': 'radial-gradient(800px 400px at 50% 120%, rgba(167,139,250,0.18), transparent 60%)',
      },
      animation: {
        'fade-in':    'fadeIn .25s ease-out',
        'pulse-dot':  'pulseDot 1.6s infinite',
        'glow':       'glow 3s ease-in-out infinite',
        'slide-up':   'slideUp .45s ease-out both',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: 1 },
          '50%':      { opacity: 0.35 },
        },
        glow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 6px currentColor)' },
          '50%':      { filter: 'drop-shadow(0 0 16px currentColor)' },
        },
      },
    },
  },
  plugins: [],
};
