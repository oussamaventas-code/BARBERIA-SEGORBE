/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    screens: {
      xs: '390px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1440px',
    },
    extend: {
      colors: {
        obsidian: '#0D0D12',
        champagne: { DEFAULT: '#C9A84C', light: '#DCC27A', dark: '#A88A36' },
        ivory: '#FAF8F5',
        slate: { DEFAULT: '#2A2A35', 700: '#22222B', 600: '#33333F', 500: '#3D3D4A' },
        steel: '#85858E',
        status: {
          pending: '#E8C547',
          confirmed: '#C9A84C',
          completed: '#5FB98A',
          cancelled: '#6E6E78',
          noshow: '#D9776F',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.045em',
        tighter: '-0.03em',
        label: '0.22em',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      transitionTimingFunction: {
        luxe: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      boxShadow: {
        luxe: '0 30px 80px -20px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(201,168,76,0.25), 0 20px 60px -20px rgba(201,168,76,0.35)',
      },
    },
  },
  plugins: [],
}
