// src/pages/api/admin/theme.js
import { tenantConfigs } from '@/lib/tenant/config';

// In-memory storage for theme settings (in production this would be in a database)
let themeCache = {};

export default async function handler(req, res) {
  // Check for admin authorization
  const adminToken = req.headers.authorization?.split(' ')[1];
  if (!adminToken || adminToken !== 'demo-admin-token') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin authentication required'
    });
  }

  const tenantId = req.headers['x-tenant-id'] || 'default';

  // GET - Retrieve theme settings
  if (req.method === 'GET') {
    try {
      // If we have cached theme settings, return those
      if (themeCache[tenantId]) {
        return res.status(200).json(themeCache[tenantId]);
      }
      
      // Otherwise, get defaults from the tenant config
      const tenantConfig = tenantConfigs[tenantId] || tenantConfigs.default;
      
      // Return theme settings
      const themeSettings = tenantConfig.theme || {};
      
      // Cache the settings
      themeCache[tenantId] = themeSettings;
      
      return res.status(200).json(themeSettings);
    } catch (err) {
      console.error('Error fetching theme settings:', err);
      return res.status(500).json({
        error: 'Server Error',
        message: 'An error occurred while fetching theme settings',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  } 
  
  // PUT - Update theme settings
  else if (req.method === 'PUT') {
    try {
      const updatedSettings = req.body;
      
      // Basic validation
      if (!updatedSettings || typeof updatedSettings !== 'object') {
        return res.status(400).json({
          error: 'Invalid Request',
          message: 'Invalid theme settings data'
        });
      }
      
      // Store the updated settings
      themeCache[tenantId] = updatedSettings;
      
      // In a real application, you would save these to a database
      // For demo purposes, we're just storing them in memory
      
      return res.status(200).json({
        success: true,
        message: 'Theme settings updated successfully',
        settings: updatedSettings
      });
    } catch (err) {
      console.error('Error updating theme settings:', err);
      return res.status(500).json({
        error: 'Server Error',
        message: 'An error occurred while updating theme settings',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
  
  // Handle other HTTP methods
  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ 
    error: 'Method Not Allowed',
    message: `Method ${req.method} is not allowed` 
  });
}