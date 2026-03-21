import { heroui } from '@heroui/react';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // Local node_modules (si npm instala localmente)
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
    // Root node_modules del monorepo (hoisting de npm workspaces)
    '../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  darkMode: 'class',
  plugins: [heroui()],
};
