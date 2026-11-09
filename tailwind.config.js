/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effaf6',
          100: '#d6f3e8',
          500: '#12906a',
          600: '#0e7556',
          700: '#0b5d45',
        },
      },
    },
  },
  plugins: [],
};
