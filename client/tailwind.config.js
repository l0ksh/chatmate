/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chatmate: {
          background: '#FAF9F6',
          primary: '#2A9D8F',
        },
      },
    },
  },
  plugins: [],
};
