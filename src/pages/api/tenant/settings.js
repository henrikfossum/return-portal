// src/pages/api/tenant/settings.js
import { tenantConfigs } from '@/lib/tenant/config';

export default async function handler(req, res) {
  // Only handle GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ 
      error: 'Method Not Allowed', 
      message: `Method ${req.method} is not allowed` 
    });
  }

  // Get tenant ID from query params or request headers
  const tenantId = req.query.tenantId || req.headers['x-tenant-id'] || 'default';

  try {
    // Get tenant config
    const tenantConfig = tenantConfigs[tenantId] || tenantConfigs.default;
    
    // For security, remove any sensitive data like API keys before returning
    const safeConfig = {
      name: tenantConfig.name,
      theme: tenantConfig.theme,
      settings: tenantConfig.settings,
      locale: tenantConfig.locale,
    };
    
    return res.status(200).json(safeConfig);
  } catch (err) {
    console.error('Error fetching tenant settings:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}