/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: '#2C57D8', // main blue, first reviewer
        accent: '#F07A3E', // orange, second reviewer
        ink: '#16191D', // main text
        muted: '#5B636C', // secondary text
        canvas: '#F4F5F7', // light screen background
      },
    },
  },
  plugins: [],
};
