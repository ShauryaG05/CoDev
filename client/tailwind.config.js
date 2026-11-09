/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ide: {
          bg: '#090a0d',
          sidebar: '#0d0f14',
          surface: '#111319',
          panel: '#151821',
          elevated: '#1a1e29',
          border: '#232734',
          borderSubtle: '#181b24',
          hover: '#1e2230',
          accent: '#4f46e5',
          accentHover: '#4338ca',
          accentMuted: 'rgba(79, 70, 229, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Geist Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'subtle-inner': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'elevated': '0 8px 30px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};
