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
      animation: {
        'slide-up': 'slideUp 0.5s ease-out'
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      fontFamily: {
        sans: ['Archivo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}