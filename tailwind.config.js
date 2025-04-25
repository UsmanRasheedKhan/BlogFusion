module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          main: '#000000',
          hover: '#1a1a1a',
          light: '#f5f5f5',
        },
        secondary: {
          main: '#22c55e',
          hover: '#16a34a',
          light: '#dcfce7',
        },
      },
      backgroundColor: theme => ({
        ...theme('colors'),
      }),
      textColor: theme => ({
        ...theme('colors'),
      }),
      gradientColorStops: theme => ({
        ...theme('colors'),
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}