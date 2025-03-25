// src/lib/tenant/config.js
export const tenantConfigs = {
  default: {
    name: 'Demo Store',
    // Shopify credentials
    shopify: {
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecret: process.env.SHOPIFY_API_SECRET,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
      shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
    },
    // Enhanced theme options
    theme: {
      // Colors
      primaryColor: '#4f46e5', // Primary action color
      secondaryColor: '#f59e0b', // Secondary action color
      accentColor: '#10b981', // Accent elements
      backgroundColor: '#ffffff', // Page background
      textColor: '#111827', // Primary text
      secondaryTextColor: '#6b7280', // Secondary text 
      borderColor: '#e5e7eb', // Border color
      successColor: '#10b981', // Success indicators
      warningColor: '#f59e0b', // Warning indicators
      dangerColor: '#ef4444', // Error/danger indicators
      
      // Typography
      fontFamily: 'Inter, system-ui, sans-serif', // Primary font
      headingFontFamily: 'Inter, system-ui, sans-serif', // Heading font
      fontSize: '16px', // Base font size
      
      // Optional custom CSS
      customCSS: '', // Additional CSS to inject
      
      // Logo and branding
      logo: null, // URL to company logo
      logoWidth: '120px',
      logoHeight: 'auto',
      favicon: null, // URL to favicon
    },
    // Return settings
    settings: {
      returnWindowDays: 100,
      allowExchanges: true,
      requirePhotos: false,
      autoApproveReturns: true,
      notifyOnReturn: true,
      returnReasons: [
        'Defective',
        'Wrong size',
        'Changed mind',
        'Not as described',
        'Arrived too late',
      ],
    },
    // Language settings
    locale: {
      defaultLanguage: 'en', // Default language code
      supportedLanguages: ['en', 'es', 'fr', 'de', 'no'], // Available languages
      // Whether to auto-detect language from browser
      detectBrowserLanguage: true,
    },
  },
  
  // Example tenant with custom branding
  acme: {
    name: 'ACME Store',
    shopify: {
      // Specific Shopify credentials would be here
      apiKey: process.env.ACME_SHOPIFY_API_KEY,
      apiSecret: process.env.ACME_SHOPIFY_API_SECRET,
      accessToken: process.env.ACME_SHOPIFY_ACCESS_TOKEN,
      shopDomain: process.env.ACME_SHOPIFY_SHOP_DOMAIN,
    },
    theme: {
      primaryColor: '#00457C', // ACME blue
      secondaryColor: '#FF671F', // ACME orange
      accentColor: '#009F75', // ACME green
      backgroundColor: '#ffffff',
      textColor: '#333333',
      secondaryTextColor: '#666666',
      borderColor: '#dddddd',
      successColor: '#009F75',
      warningColor: '#FF671F',
      dangerColor: '#d32f2f',
      fontFamily: '"Roboto", sans-serif',
      headingFontFamily: '"Roboto Condensed", sans-serif',
      fontSize: '16px',
      customCSS: `
        .return-button { 
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 500;
        }
      `,
      logo: 'https://example.com/acme-logo.png',
      logoWidth: '150px',
      logoHeight: 'auto',
      favicon: 'https://example.com/acme-favicon.ico',
    },
    settings: {
      returnWindowDays: 30,
      allowExchanges: true,
      requirePhotos: true,
      autoApproveReturns: false,
      notifyOnReturn: true,
      returnReasons: [
        'Defective',
        'Wrong size/fit',
        'Not as described',
        'Changed mind',
        'Received wrong item',
      ],
    },
    locale: {
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'es'],
      detectBrowserLanguage: true,
    },
  },
};