/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom colors for better dark mode support
        gray: {
          850: '#1f2937',
          950: '#111827',
        }
      }
    },
  },
  plugins: [],
};
