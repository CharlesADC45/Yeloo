import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-yeloo)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
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
        // Same steps as --yeloo-blue-* / --yeloo-sun-* in globals.css (hex so /opacity modifiers work).
        brand: {
          50: '#eef3ff',
          100: '#dbe5ff',
          200: '#b9cbff',
          300: '#8eabfa',
          400: '#5f84f0',
          500: '#3b63e3',
          600: '#1d4ed8',
          700: '#173ea5',
          800: '#123b8c',
          900: '#0b2e6d',
          950: '#071a3f',
        },
        sun: {
          50: '#fffbea',
          100: '#fff3c4',
          300: '#ffdd66',
          400: '#ffc928',
          600: '#e0a800',
          800: '#7a5a00',
        },
        accent: 'var(--yeloo-brand-sun)',
        ink: 'var(--yeloo-brand-ink)',
        muted: 'var(--yeloo-brand-muted)',
        line: 'var(--yeloo-brand-line)',
      },
      backgroundImage: {
        'yeloo-brand': 'var(--yeloo-gradient-brand)',
        'yeloo-soft': 'var(--yeloo-gradient-soft)',
        'yeloo-sun': 'var(--yeloo-gradient-sun)',
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

