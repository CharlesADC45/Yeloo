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
          base: '#FFFFFF',
          surface: '#FFFFFF',
          canvas: '#F6F8FC',
          secondary: 'var(--yeloo-brand-primary)',
          secondarySoft: 'var(--yeloo-brand-primary-soft)',
        },
        primary: {
          DEFAULT: 'var(--yeloo-brand-primary)',
          light: '#4C73E6',
          dark: 'var(--yeloo-brand-primary-hover)',
        },
        accent: 'var(--yeloo-brand-sun)',
        ink: 'var(--yeloo-brand-ink)',
        muted: 'var(--yeloo-brand-muted)',
        line: 'var(--yeloo-brand-line)',
      },
      boxShadow: {
        soft: 'var(--yeloo-shadow-sm)',
        brand: 'var(--yeloo-shadow-md)',
      },
      borderRadius: {
        brand: 'var(--yeloo-radius-lg)',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;

