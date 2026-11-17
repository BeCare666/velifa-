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
        score: {
          good:    'var(--velifa-score-good)',
          average: 'var(--velifa-score-average)',
          poor:    'var(--velifa-score-poor)',
        },
      },
      fontFamily: {
        brand:   ['var(--velifa-font-brand)'],
        heading: ['var(--velifa-font-heading)'],
        body:    ['var(--velifa-font-body)'],
        sans:    ['var(--velifa-font-body)'],
      },
      backgroundImage: {
        'gradient-accent':    'var(--brand-gradient)',
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
        accent:      'var(--shadow-accent)',
      },
      letterSpacing: {
        eyebrow: '0.32em',
        brand:   '0.32em',
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
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.72' },
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
