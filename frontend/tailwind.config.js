/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'voice-gradient': 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 45%, #9333ea 100%)',
      },
    },
  },
  plugins: [],
};
