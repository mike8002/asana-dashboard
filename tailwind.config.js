/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        surface: {
          primary: '#0a0a0a',
          card: '#141414',
          hover: '#1a1a1a',
          border: '#262626',
        },
        accent: {
          teal: '#1D9E75',
          tealLight: '#E1F5EE',
          tealDark: '#0F6E56',
          blue: '#378ADD',
          blueLight: '#E6F1FB',
          blueDark: '#185FA5',
          red: '#E24B4A',
          redLight: '#FCEBEB',
          redDark: '#A32D2D',
          purple: '#7F77DD',
          purpleLight: '#EEEDFE',
          amber: '#EF9F27',
          amberLight: '#FAEEDA',
          amberDark: '#854F0B',
        },
      },
    },
  },
  plugins: [],
};
