// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Theme colors using CSS variables
        theme: {
          primary: 'var(--theme-primary-500)',
          secondary: 'var(--theme-secondary-500)',
          accent: 'var(--theme-accent-500)',
          success: 'var(--theme-success-500)',
          warning: 'var(--theme-warning-500)',
          danger: 'var(--theme-danger-500)',
          info: 'var(--theme-info-500)',
          background: 'var(--theme-background)',
          surface: 'var(--theme-surface)',
          text: {
            DEFAULT: 'var(--theme-text)',
            light: 'var(--theme-text-light)',
            inverse: 'var(--theme-text-inverse)',
          },
          border: 'var(--theme-border)',
        },
        
        // Keep existing color palettes but use CSS variables for the base values
        primary: {
          50: 'var(--theme-primary-50, #e6f2ff)',
          100: 'var(--theme-primary-100, #b3daff)',
          200: 'var(--theme-primary-200, #80c2ff)',
          300: 'var(--theme-primary-300, #4da9ff)',
          400: 'var(--theme-primary-400, #1a91ff)',
          500: 'var(--theme-primary-500, #0077e6)',
          600: 'var(--theme-primary-600, #0060b8)',
          700: 'var(--theme-primary-700, #004a8a)',
          800: 'var(--theme-primary-800, #00335c)',
          900: 'var(--theme-primary-900, #001d33)',
        },
        secondary: {
          50: 'var(--theme-secondary-50, #f8fafc)',
          100: 'var(--theme-secondary-100, #f1f5f9)',
          200: 'var(--theme-secondary-200, #e2e8f0)',
          300: 'var(--theme-secondary-300, #cbd5e1)',
          400: 'var(--theme-secondary-400, #94a3b8)',
          500: 'var(--theme-secondary-500, #64748b)',
          600: 'var(--theme-secondary-600, #475569)',
          700: 'var(--theme-secondary-700, #334155)',
          800: 'var(--theme-secondary-800, #1e293b)',
          900: 'var(--theme-secondary-900, #0f172a)',
        },
        success: {
          50: 'var(--theme-success-50, #e6f7f0)',
          100: 'var(--theme-success-100, #b3eacc)',
          200: 'var(--theme-success-200, #80dea8)',
          300: 'var(--theme-success-300, #4dd184)',
          400: 'var(--theme-success-400, #1ac460)',
          500: 'var(--theme-success-500, #00b347)',
          600: 'var(--theme-success-600, #008f39)',
          700: 'var(--theme-success-700, #006b2b)',
          800: 'var(--theme-success-800, #00471d)',
          900: 'var(--theme-success-900, #00230f)',
        },
        danger: {
          50: 'var(--theme-danger-50, #ffe6e6)',
          100: 'var(--theme-danger-100, #ffb3b3)',
          200: 'var(--theme-danger-200, #ff8080)',
          300: 'var(--theme-danger-300, #ff4d4d)',
          400: 'var(--theme-danger-400, #ff1a1a)',
          500: 'var(--theme-danger-500, #e60000)',
          600: 'var(--theme-danger-600, #b80000)',
          700: 'var(--theme-danger-700, #8a0000)',
          800: 'var(--theme-danger-800, #5c0000)',
          900: 'var(--theme-danger-900, #330000)',
        },
        warning: {
          50: 'var(--theme-warning-50, #fffbeb)',
          100: 'var(--theme-warning-100, #fef3c7)',
          200: 'var(--theme-warning-200, #fde68a)',
          300: 'var(--theme-warning-300, #fcd34d)',
          400: 'var(--theme-warning-400, #fbbf24)',
          500: 'var(--theme-warning-500, #f59e0b)',
          600: 'var(--theme-warning-600, #d97706)',
          700: 'var(--theme-warning-700, #b45309)',
          800: 'var(--theme-warning-800, #92400e)',
          900: 'var(--theme-warning-900, #78350f)',
        },
      },
      // Font family using CSS variables
      fontFamily: {
        sans: ['var(--theme-font-family)', 'var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--theme-font-family-heading)', 'var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      // Font sizes using CSS variables
      fontSize: {
        'base': 'var(--theme-font-size-base, 1rem)',
      },
      // Keep existing shadow and transition properties
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'medium': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      transitionProperty: {
        'colors': 'color, background-color, border-color, text-decoration-color, fill, stroke',
      }
    }
  },
  // Enable dark mode
  darkMode: 'class',
  plugins: [],
}