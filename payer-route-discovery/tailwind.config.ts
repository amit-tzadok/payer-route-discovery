import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ruma: {
          // Clean white/light backgrounds
          bg:         '#f9fafb',   // page bg
          'bg-2':     '#f3f4f6',   // card/section bg
          'bg-3':     '#e5e7eb',   // tertiary
          // Brand navy/blue (dark primary)
          blue:       '#1e3a8a',   // primary action (dark navy)
          'blue-light':'#1e40af',  // hover
          'blue-dark':'#172554',   // active/pressed
          // Bright cyan accents (secondary)
          cyan:       '#06b6d4',   // cyan accent
          'cyan-light':'#e0f2fe',  // cyan background
          'cyan-dark': '#0c4a6e',  // cyan text
          // Semantic — green (verified)
          green:      '#10b981',
          'green-bg': '#d1fae5',
          'green-dark':'#065f46',
          // Semantic — red (deprecated / dead)
          red:        '#ef4444',
          'red-bg':   '#fee2e2',
          // Semantic — orange (conflict / uncertain)
          orange:     '#f97316',
          'orange-bg':'#fed7aa',
          'orange-dark':'#7c2d12',
          // Borders & dividers
          border:     '#e5e7eb',
          'border-2': '#d1d5db',
          // Text
          text:       '#111827',
          muted:      '#6b7280',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      transitionDuration: {
        350: '350ms',
      },
    },
  },
  plugins: [],
  // Safelist classes that appear inside JS ternary expressions
  // so Tailwind JIT never purges them from the CSS bundle
  safelist: [
    'bg-ruma-cyan-light',
    'text-ruma-cyan-dark',
    'bg-ruma-green-bg',
    'text-ruma-green-dark',
    'bg-ruma-orange-bg',
    'text-ruma-orange-dark',
    'bg-ruma-red-bg',
  ],
}

export default config
