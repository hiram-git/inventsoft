/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    './node_modules/flowbite-react/lib/**/*.js',
    './node_modules/flowbite/dist/flowbite.js',
  ],
  plugins: [
    require('flowbite/plugin'),
  ],
};
