export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf6',
          100: '#dbf9ea',
          200: '#b8f2d5',
          300: '#83e4ba',
          400: '#46cd97',
          500: '#15966c',
          600: '#0d4a38', // Cambridge Forest Green brand base
          700: '#0a3c2e',
          800: '#083025',
          900: '#06261d',
          950: '#031510',
        },
        secondary: {
          50: '#fdf8f4',
          100: '#fcf0e7',
          200: '#f8decb',
          300: '#f2c3a5',
          400: '#e89e71',
          500: '#ba6438', // Cambridge Warm Terracotta / Copper brand base
          600: '#a6542d',
          700: '#8a4324',
          800: '#6f361f',
          900: '#5c2d1b',
        },
        accent: {
          50: '#fef3ec',
          100: '#fde4d3',
          200: '#fbc9a8',
          500: '#c8673b',
          600: '#b85a2e',
        },
        cambridge: {
          forest: '#0D4A38',
          deep: '#07251C',
          emerald: '#126E51',
          light: '#1B9A72',
          mint: '#EBF7F2',
          copper: '#BA6438',
          terracotta: '#A6542D',
          cream: '#FAF8F5',
          dark: '#0F172A',
          charcoal: '#1E293B',
          soft: '#F4F7F5'
        }
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      animation: {
        'blob': 'blob 7s infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        }
      },
    },
  },
  plugins: [],
}
