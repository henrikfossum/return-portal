// Extended color palette suggestions
module.exports = {
  theme: {
    extend: {
      colors: {
        // Add a more cohesive color palette
        primary: {
          50:  '#e6f2ff',
          100: '#b3daff',
          200: '#80c2ff',
          300: '#4da9ff',
          400: '#1a91ff',
          500: '#0077e6', // Base primary color
          600: '#0060b8',
          700: '#004a8a',
          800: '#00335c',
          900: '#001d33'
        },
        success: {
          50:  '#e6f7f0',
          100: '#b3eacc',
          200: '#80dea8',
          300: '#4dd184',
          400: '#1ac460',
          500: '#00b347', // Base success color
          600: '#008f39',
          700: '#006b2b',
          800: '#00471d',
          900: '#00230f'
        },
        danger: {
          50:  '#ffe6e6',
          100: '#ffb3b3',
          200: '#ff8080',
          300: '#ff4d4d',
          400: '#ff1a1a',
          500: '#e60000', // Base danger color
          600: '#b80000',
          700: '#8a0000',
          800: '#5c0000',
          900: '#330000'
        }
      },
      // Enhance shadow and transition effects
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'medium': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      // Add smooth transition properties
      transitionProperty: {
        'colors': 'color, background-color, border-color, text-decoration-color, fill, stroke',
      }
    }
  }
}