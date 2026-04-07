import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        foundation: {
          base: '#F8FAFC',
          surface: '#FFFFFF',
          secondary: '#2563EB',
          secondarySoft: '#EAF1FF',
        },
        primary: {
          DEFAULT: '#2563EB',
          light: '#4F7CFF',
          dark: '#1D4ED8',
        },
        accent: '#14B8A6',
      },
      boxShadow: {
        soft: '0 12px 34px rgba(37,99,235,0.08)',
      },
      borderRadius: {
        '4xl': '2.5rem',
      },
    },
  },
  plugins: [],
};

export default config;

