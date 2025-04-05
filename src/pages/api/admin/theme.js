// src/pages/api/admin/theme.js
import jwt from 'jsonwebtoken';
import { tenantConfigs } from '@/lib/tenant/config';

// In-memory storage for theme settings (in production this would be in a database)
let themeCache = {};

export default async function handler(req, res) {
  console.log('Theme API Request:', {
    method: req.method,
    body: req.body,
    tenantId: req.headers['x-tenant-id'] || 'default'
  });

  // Check for admin authorization using JWT
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token required' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-jwt-secret-replace-in-production'
    );
    // Optionally, check user role or other properties here if needed.
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }


  const tenantId = req.headers['x-tenant-id'] || 'default';

  // GET - Retrieve theme settings
  if (req.method === 'GET') {
    try {
      // If we have cached theme settings, return those
      if (themeCache[tenantId]) {
        console.log('Returning cached theme settings');
        return res.status(200).json(themeCache[tenantId]);
      }
      
      // Otherwise, get defaults from the tenant config
      const tenantConfig = tenantConfigs[tenantId] || tenantConfigs.default;
      
      // Return theme settings
      const themeSettings = tenantConfig.theme || {};
      
      // Cache the settings
      themeCache[tenantId] = themeSettings;
      
      console.log('Returning default theme settings');
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
      
      console.log('Received theme update:', updatedSettings);
      
      // Basic validation
      if (!updatedSettings || typeof updatedSettings !== 'object') {
        console.error('Invalid theme settings data');
        return res.status(400).json({
          error: 'Invalid Request',
          message: 'Invalid theme settings data'
        });
      }
      
      // Store the updated settings
      themeCache[tenantId] = updatedSettings;
      
      console.log('Theme settings updated successfully:', themeCache[tenantId]);
      
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