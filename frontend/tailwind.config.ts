import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:              'var(--bg)',
        'bg-subtle':     'var(--bg-subtle)',
        surface:         'var(--surface)',
        'surface-raised':'var(--surface-raised)',
        'surface-hover': 'var(--surface-hover)',
        border:          'var(--border)',
        'border-strong': 'var(--border-strong)',
        text:            'var(--text)',
        'text-muted':    'var(--text-muted)',
        'text-subtle':   'var(--text-subtle)',
        accent:          'var(--accent)',
        'accent-hover':  'var(--accent-hover)',
        'accent-soft':   'var(--accent-soft)',
        gold: {
          50:  'var(--velifa-gold-50)',
          100: 'var(--velifa-gold-100)',
          200: 'var(--velifa-gold-200)',
          300: 'var(--velifa-gold-300)',
          400: 'var(--velifa-gold-400)',
          500: 'var(--velifa-gold-500)',
          600: 'var(--velifa-gold-600)',
          700: 'var(--velifa-gold-700)',
          800: 'var(--velifa-gold-800)',
        },
        score: {
          good:    'var(--velifa-score-good)',
          average: 'var(--velifa-score-average)',
          poor:    'var(--velifa-score-poor)',
        },
      },
      fontFamily: {
        brand:   ['Orbitron', 'sans-serif'],
        heading: ['Chakra Petch', 'sans-serif'],
        body:    ['Sora', 'system-ui', 'sans-serif'],
        sans:    ['Sora', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-gold':      'var(--velifa-gradient-gold)',
        'gradient-gold-soft': 'var(--velifa-gradient-gold-soft)',
      },
      borderRadius: {
        'velifa-sm': 'var(--velifa-radius-sm)',
        'velifa-md': 'var(--velifa-radius-md)',
        'velifa-lg': 'var(--velifa-radius-lg)',
        'velifa-xl': 'var(--velifa-radius-xl)',
      },
      boxShadow: {
        'velifa-sm': 'var(--shadow-sm)',
        'velifa-md': 'var(--shadow-md)',
        'velifa-lg': 'var(--shadow-lg)',
        gold:        'var(--shadow-gold)',
      },
      letterSpacing: {
        eyebrow: '0.42em',
        brand:   '0.14em',
      },
      transitionTimingFunction: {
        velifa: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'velifa-rise': {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'velifa-glow': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(212,175,55,0.0)' },
          '50%':     { boxShadow: '0 0 28px 0 rgba(212,175,55,0.35)' },
        },
      },
      animation: {
        'velifa-rise': 'velifa-rise 0.6s var(--velifa-ease) both',
        'velifa-glow': 'velifa-glow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
