/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        palette: {
          mint: '#80EF80',
          cream: '#E3F0A3',
          sage: '#BADBA2',
          emerald: '#42D674',
        },
        forest: {
          950: '#060a07',
          900: '#0c130d',
          850: '#101a12',
          800: '#162419',
          700: '#1f3323',
          600: '#2b4631',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
