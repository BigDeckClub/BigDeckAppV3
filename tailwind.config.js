/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // MTG Color System - WUBRG + Colorless/Artifact
      colors: {
        // MTG White - warm cream/gold tones
        'mtg-W': {
          DEFAULT: '#F9FAF4',
          light: '#FFFDF7',
          dark: '#F8E7B9',
          muted: '#E8DFC4',
          bg: 'rgba(249, 250, 244, 0.15)',
        },
        // MTG Blue - ocean/sky blue
        'mtg-U': {
          DEFAULT: '#0E68AB',
          light: '#1E90D0',
          dark: '#0A4E82',
          muted: '#4A90B8',
          bg: 'rgba(14, 104, 171, 0.15)',
        },
        // MTG Black - deep shadows
        'mtg-B': {
          DEFAULT: '#150B00',
          light: '#2D2D2D',
          dark: '#0A0505',
          muted: '#4A4A4A',
          bg: 'rgba(21, 11, 0, 0.25)',
        },
        // MTG Red - fiery crimson
        'mtg-R': {
          DEFAULT: '#D3202A',
          light: '#E84545',
          dark: '#A31A22',
          muted: '#B85450',
          bg: 'rgba(211, 32, 42, 0.15)',
        },
        // MTG Green - forest emerald
        'mtg-G': {
          DEFAULT: '#00733E',
          light: '#10A060',
          dark: '#005C32',
          muted: '#4A8B60',
          bg: 'rgba(0, 115, 62, 0.15)',
        },
        // Colorless/Artifact - neutral gray
        'mtg-C': {
          DEFAULT: '#9CA3AF',
          light: '#BFC5CD',
          dark: '#6B7280',
          muted: '#78818D',
          bg: 'rgba(156, 163, 175, 0.15)',
        },
        // Multi-color/Gold
        'mtg-M': {
          DEFAULT: '#C9A227',
          light: '#E5C040',
          dark: '#9A7B1E',
          muted: '#B89E50',
          bg: 'rgba(201, 162, 39, 0.15)',
        },
        // Accent color for CTAs and focus
        accent: {
          DEFAULT: '#6366F1',
          light: '#818CF8',
          dark: '#4F46E5',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        // Extended neutrals for backgrounds & text
        neutral: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#09090B',
        },
        // UI tokens mapped to CSS variables so runtime themes can drive Tailwind styles
        ui: {
          bg: 'var(--bda-bg)',
          surface: 'var(--bda-surface)',
          card: 'var(--bda-card)',
          text: 'var(--bda-text)',
          heading: 'var(--bda-heading)',
          muted: 'var(--bda-muted)',
          border: 'var(--bda-border)',
          primary: 'var(--bda-primary)',
          'primary-foreground': 'var(--bda-primary-foreground)',
          accent: 'var(--bda-accent)',
          ring: 'var(--bda-ring)',
        },
        page: 'var(--bg-page)',
        surface: 'var(--surface)',
        'muted-surface': 'var(--muted-surface)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        accent: 'var(--accent)',
      },
      // Typography
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Lora', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontWeight: {
        display: '600',
      },
      // Spacing scale (4px base)
      spacing: {
        '4.5': '1.125rem', // 18px
        '13': '3.25rem',   // 52px
        '15': '3.75rem',   // 60px
        '18': '4.5rem',    // 72px
        '22': '5.5rem',    // 88px
      },
      // Border radius
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      // Box shadows with MTG color variants
      boxShadow: {
        'inner-sm': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'glow-W': '0 0 20px rgba(249, 250, 244, 0.3)',
        'glow-U': '0 0 20px rgba(14, 104, 171, 0.4)',
        'glow-B': '0 0 20px rgba(21, 11, 0, 0.5)',
        'glow-R': '0 0 20px rgba(211, 32, 42, 0.4)',
        'glow-G': '0 0 20px rgba(0, 115, 62, 0.4)',
        'glow-M': '0 0 20px rgba(201, 162, 39, 0.4)',
        'glow-accent': '0 0 20px rgba(99, 102, 241, 0.4)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'drawer': '-4px 0 15px rgba(0, 0, 0, 0.2)',
      },
      // Animations
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      // Z-index scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      // Backdrop blur
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
