/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Atlassian Design System inspired colors
      colors: {
        // Primary colors
        primary: {
          50: '#e6f3ff',
          100: '#b3d9ff',
          200: '#80bfff',
          300: '#4da6ff',
          400: '#1a8cff',
          500: '#0052cc', // Atlassian Blue
          600: '#0049b3',
          700: '#003d99',
          800: '#003080',
          900: '#002466',
        },
        // Neutral colors
        neutral: {
          0: '#ffffff',
          100: '#f7f8f9',
          200: '#f1f2f4',
          300: '#dfe1e6',
          400: '#b3bac5',
          500: '#8993a4',
          600: '#6b778c',
          700: '#505f79',
          800: '#42526e',
          900: '#253858',
          1000: '#091e42',
        },
        // Status colors
        success: {
          50: '#e3fcef',
          100: '#abf5d1',
          200: '#79f2c0',
          300: '#57d9a3',
          400: '#36b37e',
          500: '#00875a',
          600: '#006644',
          700: '#004b32',
          800: '#003329',
          900: '#001b16',
        },
        warning: {
          50: '#fffae6',
          100: '#fff0b3',
          200: '#ffe380',
          300: '#ffd33d',
          400: '#ffab00',
          500: '#ff8b00',
          600: '#ff7043',
          700: '#de350b',
          800: '#bf2600',
          900: '#8b1a00',
        },
        danger: {
          50: '#ffebe6',
          100: '#ffbdad',
          200: '#ff8f73',
          300: '#ff7452',
          400: '#ff5630',
          500: '#de350b',
          600: '#bf2600',
          700: '#8b1a00',
          800: '#601700',
          900: '#441400',
        },
      },
      // Typography
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      // Spacing
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      // Border radius
      borderRadius: {
        sm: '3px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      // Box shadow
      boxShadow: {
        sm: '0 1px 1px rgba(9, 30, 66, 0.25)',
        md: '0 4px 8px -2px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
        lg: '0 8px 16px -4px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
        xl: '0 12px 24px -6px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
      },
    },
  },
  plugins: [],
};
