/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        // Grid for the calendar with 53 columns (max weeks in a year)
        '53': 'repeat(53, minmax(0, 1fr))',
        // Grid for the calendar with 52 weeks
        '52': 'repeat(52, minmax(0, 1fr))',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      ringWidth: {
        '3': '3px',
      },
      ringOffsetWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
} 