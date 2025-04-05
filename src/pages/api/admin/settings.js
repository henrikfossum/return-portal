// src/pages/api/admin/settings.js
import jwt from 'jsonwebtoken';
import { tenantConfigs } from '@/lib/tenant/config';

// In-memory storage for settings (in production this would be in a database)
let settingsCache = {};

export default async function handler(req, res) {
  // Check for admin authorization using JWT
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token required' });
  }
  const token = authHeader.split(' ')[1];

  try {
    jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-jwt-secret-replace-in-production'
    );
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }


  const tenantId = req.headers['x-tenant-id'] || 'default';

  // GET - Retrieve settings
  if (req.method === 'GET') {
    try {
      // If we have cached settings, return those
      if (settingsCache[tenantId]) {
        return res.status(200).json(settingsCache[tenantId]);
      }
      
      // Otherwise, get defaults from the tenant config
      const tenantConfig = tenantConfigs[tenantId] || tenantConfigs.default;
      
      // Construct default settings
      const defaultSettings = {
        returnWindowDays: tenantConfig.settings.returnWindowDays || 100,
        allowExchanges: tenantConfig.settings.allowExchanges !== false,
        requirePhotos: tenantConfig.settings.requirePhotos || false,
        autoApproveReturns: tenantConfig.settings.autoApproveReturns !== false,
        notifyOnReturn: tenantConfig.settings.notifyOnReturn !== false,
        returnReasons: tenantConfig.settings.returnReasons || [
          'Defective',
          'Wrong size',
          'Changed mind',
          'Not as described',
          'Arrived too late'
        ],
        
        // Default fraud prevention settings
        fraudPrevention: {
          enabled: true,
          maxReturnsPerCustomer: 3,
          maxReturnValuePercent: 80, // % of order value
          suspiciousPatterns: {
            frequentReturns: true,
            highValueReturns: true,
            noReceiptReturns: true,
            newAccountReturns: true,
            addressMismatch: true
          },
          autoFlagThreshold: 2 // Number of suspicious indicators before auto-flagging
        }
      };
      
      // Cache the settings
      settingsCache[tenantId] = defaultSettings;
      
      return res.status(200).json(defaultSettings);
    } catch (err) {
      console.error('Error fetching settings:', err);
      return res.status(500).json({
        error: 'Server Error',
        message: 'An error occurred while fetching settings',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  } 
  
  // PUT - Update settings
  else if (req.method === 'PUT') {
    try {
      const updatedSettings = req.body;
      
      // Basic validation
      if (!updatedSettings || typeof updatedSettings !== 'object') {
        return res.status(400).json({
          error: 'Invalid Request',
          message: 'Invalid settings data'
        });
      }
      
      // Store the updated settings
      settingsCache[tenantId] = updatedSettings;
      
      // In a real application, you would save these to a database
      // For demo purposes, we're just storing them in memory
      
      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        settings: updatedSettings
      });
    } catch (err) {
      console.error('Error updating settings:', err);
      return res.status(500).json({
        error: 'Server Error',
        message: 'An error occurred while updating settings',
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