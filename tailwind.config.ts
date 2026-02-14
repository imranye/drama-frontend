import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: '#1A1A1A',
        'surface-light': '#2A2A2A',
        accent: '#FF0066',
        'accent-dark': '#E91E63',
        gold: '#FFD700',
        'text-primary': '#FFFFFF',
        'text-secondary': '#B0B0B0',
        'text-disabled': '#4A4A4A',
      },
      aspectRatio: {
        'vertical': '9 / 16',
      },
    },
  },
  plugins: [],
}
export default config
