// src/pages/api/admin/returns/[id].js
import jwt from 'jsonwebtoken';
import { getShopifyClientForTenant } from '@/lib/shopify/client';

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


  const { id } = req.query;
  if (!id) {
    return res.status(400).json({
      error: 'Missing Required Parameter',
      message: 'Return ID is required'
    });
  }

  const tenantId = req.headers['x-tenant-id'] || 'default';

  if (req.method === 'GET') {
    try {
      const returnData = await getReturnById(id, tenantId);
      
      if (!returnData) {
        return res.status(404).json({
          error: 'Return Not Found',
          message: 'Could not find a return with the provided ID'
        });
      }
      
      return res.status(200).json(returnData);
    } catch (err) {
      // Error handling...
    }
  }
  
  
  // PATCH method - update return status
  else if (req.method === 'PATCH') {
    try {
      const { status, adminNotes } = req.body;
      
      if (!status) {
        return res.status(400).json({
          error: 'Missing Required Field',
          message: 'Status is required'
        });
      }
      
      const updatedReturn = await updateReturnStatus(id, status, adminNotes, 'admin');
      
      // After updating in database, also update in Shopify if needed
      // Keep your existing Shopify update code here
      
      return res.status(200).json({
        success: true,
        message: `Return status updated to ${status}`,
        return: updatedReturn
      });
    } catch (err) {
      // Error handling...
    }
  }
  
  // Handle other methods
  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).json({ 
    error: 'Method Not Allowed',
    message: `Method ${req.method} is not allowed` 
  });
}