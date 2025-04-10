// src/pages/api/admin/returns/[id].js
import jwt from 'jsonwebtoken';
import { getReturnById, updateReturnStatus } from '@/lib/services/returnService';

// Helper to transform MongoDB document to UI-friendly format
function transformReturnData(returnData) {
  if (!returnData) return null;
  
  // Convert MongoDB document to plain object if necessary
  const returnObject = typeof returnData.toObject === 'function' ? 
    returnData.toObject() : returnData;
  
  // Calculate the total of all items
  const totalValue = Array.isArray(returnObject.items) ? 
    returnObject.items.reduce((sum, item) => sum + (parseFloat(item.price || 0) * item.quantity), 0) : 0;

  // Transform into UI expected format
  return {
    id: returnObject._id.toString(),
    order_id: returnObject.orderNumber || returnObject.orderId,
    email: returnObject.customer?.email,
    customer: returnObject.customer,
    date: returnObject.createdAt,
    created_at: returnObject.createdAt,
    total_refund: totalValue,
    status: returnObject.status,
    // Preserve original properties
    ...returnObject
  };
}

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
      
      // Transform the data for UI consumption
      const transformedData = transformReturnData(returnData);
      
      return res.status(200).json(transformedData);
    } catch (err) {
      console.error(`GET /returns/${id} error:`, err);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while fetching the return'
      });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { status, adminNotes } = req.body;
      
      if (!status) {
        return res.status(400).json({
          error: 'Missing Required Field',
          message: 'Status is required'
        });
      }
      
      const updatedReturn = await updateReturnStatus(id, status, adminNotes, 'admin');
      
      // Transform the updated data for UI
      const transformedData = transformReturnData(updatedReturn);
      
      return res.status(200).json({
        success: true,
        message: `Return status updated to ${status}`,
        return: transformedData
      });
    } catch (err) {
      console.error(`PATCH /returns/${id} error:`, err);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while updating the return'
      });
    }
  }
  
  // Handle unsupported methods
  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).json({ 
    error: 'Method Not Allowed',
    message: `Method ${req.method} is not allowed`
  });
}