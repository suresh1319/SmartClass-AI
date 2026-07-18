/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#f6f6f7',
          100: '#ececed',
          200: '#d5d6d8',
          300: '#b0b2b8',
          400: '#838790',
          500: '#646973',
          600: '#50545e',
          700: '#41454e',
          800: '#1e2024',
          900: '#121316',
          950: '#0a0a0c',
        },
        brand: {
          50: '#eef8ff',
          100: '#d8eeff',
          200: '#b9e0ff',
          300: '#89ceff',
          400: '#52b3ff',
          500: '#2a93ff',
          600: '#1374f5',
          700: '#0d5ee1',
          800: '#114cb7',
          900: '#144290',
          950: '#112957',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
