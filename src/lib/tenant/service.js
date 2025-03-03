  // src/lib/tenant/service.js
    // src/lib/tenant/service.js
    import { tenantConfigs } from './config';

    export async function getTenantConfig(tenantId = 'default') {
    // In production, this would fetch from a database
    return tenantConfigs[tenantId] || tenantConfigs.default;
    }

  export async function getTenantTheme(tenantId = 'default') {
    const config = await getTenantConfig(tenantId);
    return config.theme;
  }
  
  export async function getTenantSettings(tenantId = 'default') {
    const config = await getTenantConfig(tenantId);
    return config.settings;
  }
  
  export async function getTenantShopifyConfig(tenantId = 'default') {
    const config = await getTenantConfig(tenantId);
    return config.shopify;
  }