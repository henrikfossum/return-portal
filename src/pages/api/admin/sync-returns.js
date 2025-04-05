// src/pages/api/admin/sync-returns.js
import jwt from 'jsonwebtoken';
import { syncReturnsFromShopify } from '@/lib/services/shopifySyncService';
import { withErrorHandler, createApiError, ErrorTypes } from '@/lib/api/errorHandler';

async function handler(req, res) {
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


  if (req.method !== 'POST') {
    throw createApiError(
      ErrorTypes.METHOD_NOT_ALLOWED,
      'Only POST requests are accepted'
    );
  }

  // Get parameters
  const { daysBack = 30, tenantId = 'default' } = req.body;
  
  try {
    const result = await syncReturnsFromShopify(tenantId, daysBack);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Sync error:', error);
    throw createApiError(
      ErrorTypes.INTERNAL_SERVER_ERROR,
      'Error syncing returns from Shopify'
    );
  }
}

export default withErrorHandler(handler);