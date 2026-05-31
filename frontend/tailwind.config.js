/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark backgrounds — layered depth
        base:    { DEFAULT: '#0a0a0f', 50: '#12121a', 100: '#1a1a26', 200: '#22223a' },
        surface: { DEFAULT: '#16161f', 50: '#1e1e2e', 100: '#26263a' },
        border:  { DEFAULT: '#2a2a3d', muted: '#1e1e2e' },

        // Brand accent — violet/indigo
        accent: {
          50:  '#ede9fe',
          100: '#ddd6fe',
          200: '#c4b5fd',
          300: '#a78bfa',
          400: '#8b5cf6',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
        },

        // Text hierarchy
        text: {
          primary:   '#f0f0ff',
          secondary: '#a0a0c0',
          muted:     '#606080',
        },

        // Status
        success: '#22c55e',
        warning: '#f59e0b',
        error:   '#ef4444',
        info:    '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-up':    'slideUp 0.25s ease-out',
        'slide-in':    'slideIn 0.2s ease-out',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'typing':      'typing 1s steps(3, end) infinite',
        'shimmer':     'shimmer 1.5s infinite',
        'spin-slow':   'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        typing:  { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      boxShadow: {
        'glow-sm':  '0 0 12px rgba(124,58,237,0.25)',
        'glow':     '0 0 24px rgba(124,58,237,0.35)',
        'glow-lg':  '0 0 40px rgba(124,58,237,0.45)',
        'card':     '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.6)',
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
