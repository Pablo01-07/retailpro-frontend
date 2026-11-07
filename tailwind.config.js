export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        surface: {
          light: '#f3f4f6',
          card: '#ffffff',
          border: '#e5e7eb',
        },
      },
      fontFamily: {
        sans: ['Calibri', 'Carlito', 'Segoe UI', 'Arial', 'sans-serif'],
        mono: ['Calibri', 'Carlito', 'Segoe UI', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
