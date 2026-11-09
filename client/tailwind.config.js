/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ide: {
          bg: '#18181b', // zinc-900
          sidebar: '#121214',
          panel: '#202024',
          border: '#27272a',
          hover: '#2e2e33',
          accent: '#6366f1',
        },
      },
    },
  },
  plugins: [],
};
