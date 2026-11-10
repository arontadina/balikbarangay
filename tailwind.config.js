/** @type {import('tailwindcss').Config} */
// Theme: navy #051332 replaces every white surface, orange #e58840 replaces green.
// The slate scale is inverted (light text on dark) so existing classes stay readable.
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        white: '#051332', // "bg-white" surfaces become navy; "text-white" on orange becomes navy
        navy: { DEFAULT: '#051332', 800: '#0a1d4a', 700: '#12285a' },
        slate: {
          50: '#0b1d47',
          100: '#12285a',
          200: '#243b72',
          300: '#34508a',
          400: '#8a9bc0',
          500: '#a3b1d0',
          600: '#c0cae0',
          700: '#d5ddee',
          800: '#e8edf7',
          900: '#f4f7fc',
        },
        brand: {
          50: '#1b2650',
          100: '#f6d3b3',
          500: '#e58840',
          600: '#e58840',
          700: '#f2a265',
        },
      },
    },
  },
  plugins: [],
};
