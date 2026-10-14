/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#07111F',
          900: '#0D1B2A',
          800: '#112233',
          700: '#163049',
          600: '#1D3D5C',
        },
        cyan: {
          DEFAULT: '#35D5F2',
          400: '#35D5F2',
          500: '#1BBDDB',
          600: '#0EA5C9',
        },
        blue: {
          accent: '#3977F6',
        },
        steel: '#4A6580',
        good: '#2DD4BF',
        warn: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
