/** @type {import('tailwindcss').Config} */
function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}) / ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: withOpacity('--color-surface'),
        'surface-dim': withOpacity('--color-surface-dim'),
        'surface-bright': withOpacity('--color-surface-bright'),
        'surface-container-lowest': withOpacity('--color-surface-container-lowest'),
        'surface-container-low': withOpacity('--color-surface-container-low'),
        'surface-container': withOpacity('--color-surface-container'),
        'surface-container-high': withOpacity('--color-surface-container-high'),
        'surface-container-highest': withOpacity('--color-surface-container-highest'),
        'on-surface': withOpacity('--color-on-surface'),
        'on-surface-variant': withOpacity('--color-on-surface-variant'),
        'inverse-surface': withOpacity('--color-inverse-surface'),
        'inverse-on-surface': withOpacity('--color-inverse-on-surface'),
        outline: withOpacity('--color-outline'),
        'outline-variant': withOpacity('--color-outline-variant'),
        'surface-tint': withOpacity('--color-surface-tint'),
        'surface-variant': withOpacity('--color-surface-variant'),
        primary: withOpacity('--color-primary'),
        'on-primary': withOpacity('--color-on-primary'),
        'primary-container': withOpacity('--color-primary-container'),
        'on-primary-container': withOpacity('--color-on-primary-container'),
        'inverse-primary': withOpacity('--color-inverse-primary'),
        secondary: withOpacity('--color-secondary'),
        'on-secondary': withOpacity('--color-on-secondary'),
        'secondary-container': withOpacity('--color-secondary-container'),
        'on-secondary-container': withOpacity('--color-on-secondary-container'),
        tertiary: withOpacity('--color-tertiary'),
        'on-tertiary': withOpacity('--color-on-tertiary'),
        'tertiary-container': withOpacity('--color-tertiary-container'),
        'on-tertiary-container': withOpacity('--color-on-tertiary-container'),
        error: withOpacity('--color-error'),
        'on-error': withOpacity('--color-on-error'),
        'error-container': withOpacity('--color-error-container'),
        'on-error-container': withOpacity('--color-on-error-container'),
        'primary-fixed': withOpacity('--color-primary-fixed'),
        'primary-fixed-dim': withOpacity('--color-primary-fixed-dim'),
        'on-primary-fixed': withOpacity('--color-on-primary-fixed'),
        'on-primary-fixed-variant': withOpacity('--color-on-primary-fixed-variant'),
        'secondary-fixed': withOpacity('--color-secondary-fixed'),
        'secondary-fixed-dim': withOpacity('--color-secondary-fixed-dim'),
        'on-secondary-fixed': withOpacity('--color-on-secondary-fixed'),
        'on-secondary-fixed-variant': withOpacity('--color-on-secondary-fixed-variant'),
        'tertiary-fixed': withOpacity('--color-tertiary-fixed'),
        'tertiary-fixed-dim': withOpacity('--color-tertiary-fixed-dim'),
        'on-tertiary-fixed': withOpacity('--color-on-tertiary-fixed'),
        'on-tertiary-fixed-variant': withOpacity('--color-on-tertiary-fixed-variant'),
        background: withOpacity('--color-background'),
        'on-background': withOpacity('--color-on-background'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.02em' }],
        'headline-lg': ['32px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }],
        'headline-lg-mobile': ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.75', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '0.01em' }],
        'label-sm': ['12px', { lineHeight: '1.2', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
      spacing: {
        base: '4px',
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
        gutter: '24px',
        'margin-mobile': '16px',
        'margin-desktop': '48px',
        'max-width-content': '1280px',
      },
    },
  },
  plugins: [],
}
