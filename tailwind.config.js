/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#eef4fb',
          100: '#d6e6f7',
          200: '#adc8eb',
          300: '#7aa3d9',
          400: '#4a7bc4',
          500: '#2d5fa8',
          600: '#1E4D8C',
          700: '#1a3f75',
          800: '#15325e',
          900: '#0f2447',
        },
        gold: {
          50:  '#fdf9ed',
          100: '#f9edd0',
          200: '#f2dba3',
          300: '#e8c56a',
          400: '#d4a017',
          500: '#C4A035',
          600: '#a8862a',
          700: '#8a6d22',
          800: '#6d551a',
          900: '#4f3d12',
        },
      },
      fontSize: {
        'page-title': ['24px', { fontWeight: '600', lineHeight: '32px' }],
        'section-heading': ['16px', { fontWeight: '500', lineHeight: '24px' }],
        'body': ['14px', { fontWeight: '400', lineHeight: '20px' }],
      },
    },
  },
  plugins: [],
};
