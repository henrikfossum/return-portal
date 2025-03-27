  // src/lib/tenant/service.js
    import { tenantConfigs } from './config';

    export async function getTenantConfig(tenantId = 'default') {
    // In production, this would fetch from a database
    return tenantConfigs[tenantId] || tenantConfigs.default;
    }

    export async function getTenantTheme(tenantId = 'default') {
      console.log('Getting tenant theme for:', tenantId);
      
      try {
        // First, check localStorage for persisted theme
        if (typeof window !== 'undefined') {
          const storedTheme = localStorage.getItem(`tenant-theme-${tenantId}`);
          if (storedTheme) {
            const parsedTheme = JSON.parse(storedTheme);
            console.log('Loaded theme from localStorage:', parsedTheme);
            return parsedTheme;
          }
        }
      } catch (error) {
        console.error('Error loading stored theme:', error);
      }
    
      // Fallback to configuration
      const config = await getTenantConfig(tenantId);
      console.log('Loaded theme from config:', config.theme);
      return config.theme;
    }
    
    export async function updateTenantTheme(tenantId, newTheme) {
      console.log('Updating tenant theme:', newTheme);
      
      try {
        // Update localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(`tenant-theme-${tenantId}`, JSON.stringify(newTheme));
        }
      } catch (error) {
        console.error('Error storing theme:', error);
      }
    
      return newTheme;
    }
  
  export async function getTenantSettings(tenantId = 'default') {
    const config = await getTenantConfig(tenantId);
    return config.settings;
  }
  
  export async function getTenantShopifyConfig(tenantId = 'default') {
    const config = await getTenantConfig(tenantId);
    return config.shopify;
  }