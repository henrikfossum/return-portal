// src/pages/api/admin/returns/index.js
import jwt from 'jsonwebtoken';
import { getAllReturns } from '@/lib/services/returnService';

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

  if (req.method === 'GET') {
    try {
      const { status, dateRange, page = 1, limit = 10, search } = req.query;
      
      // Use database service instead of Shopify
      const filters = { 
        status: status !== 'all' ? status : undefined,
        dateRange, 
        search,
        tenantId
      };
      
      const returnsData = await getAllReturns(filters, page, limit);
      
      return res.status(200).json(returnsData);
    } catch (err) {
      console.error('Error fetching admin returns:', err);
      return res.status(500).json({
        error: 'Server Error',
        message: 'An error occurred while processing your request',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
  
  // Handle other methods
  res.setHeader('Allow', ['GET']);
  return res.status(405).json({ 
    error: 'Method Not Allowed',
    message: `Method ${req.method} is not allowed` 
  });
}