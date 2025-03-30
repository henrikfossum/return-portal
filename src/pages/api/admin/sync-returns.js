// src/pages/api/admin/sync-returns.js
import { syncReturnsFromShopify } from '@/lib/services/shopifySyncService';
import { withErrorHandler, createApiError, ErrorTypes } from '@/lib/api/errorHandler';

async function handler(req, res) {
  // Auth check
  const adminToken = req.headers.authorization?.split(' ')[1];
  if (!adminToken || adminToken !== process.env.ADMIN_API_TOKEN) {
    throw createApiError(
      ErrorTypes.UNAUTHORIZED,
      'Admin authentication required'
    );
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