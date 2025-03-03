// src/lib/tenant/config.js
// This will eventually be loaded from a database
export const tenantConfigs = {
    default: {
      name: 'Demo Store',
      shopify: {
        apiKey: process.env.SHOPIFY_API_KEY,
        apiSecret: process.env.SHOPIFY_API_SECRET,
        accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
        shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
      },
      theme: {
        primaryColor: '#4f46e5', // indigo-600
        secondaryColor: '#f59e0b', // amber-500
        accentColor: '#10b981', // emerald-500
        fontFamily: 'Inter, system-ui, sans-serif',
        logo: null, // URL to logo
      },
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
          'Arrived too late'
        ],
      },
    },
    // Add more tenants here for production
  };  