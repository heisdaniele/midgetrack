/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,js}",
    "./src/index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        dark: '#0f172a',
        light: '#f8fafc',
      },
      fontFamily: {
        sans: ['Archivo', 'sans-serif'],
      }
    }
  },
  plugins: []
}