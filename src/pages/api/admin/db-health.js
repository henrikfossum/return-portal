// src/pages/api/admin/test-return.js
import jwt from 'jsonwebtoken';
import { createReturnRequest } from '@/lib/services/returnService';
import connectToDatabase from '@/lib/db/connection';

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

  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      error: 'Method Not Allowed', 
      message: `Method ${req.method} is not allowed` 
    });
  }

  try {
    // First, explicitly check database connection
    console.log('Testing database connection for test return...');
    await connectToDatabase();
    console.log('Database connection successful');
    
    // Get the test data from the request body
    const returnData = req.body ? JSON.parse(req.body) : {};
    
    // Ensure we have the minimal required fields
    if (!returnData.orderId || !returnData.items || !Array.isArray(returnData.items)) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: 'Missing required fields: orderId and items array'
      });
    }
    
    // Add timestamps if not present
    if (!returnData.createdAt) returnData.createdAt = new Date();
    if (!returnData.updatedAt) returnData.updatedAt = new Date();
    
    // Default status to pending if not specified
    if (!returnData.status) returnData.status = 'pending';
    
    // Add status history if not present
    if (!returnData.statusHistory) {
      returnData.statusHistory = [{
        status: returnData.status,
        timestamp: new Date(),
        notes: 'Test return created',
        updatedBy: 'admin'
      }];
    }
    
    // Ensure tenantId is set
    if (!returnData.tenantId) returnData.tenantId = 'default';
    
    console.log('Creating test return request...');
    const savedReturn = await createReturnRequest(returnData);
    
    return res.status(200).json({
      message: 'Test return created successfully',
      id: savedReturn._id.toString(),
      details: {
        orderId: savedReturn.orderId,
        orderNumber: savedReturn.orderNumber,
        status: savedReturn.status,
        itemsCount: savedReturn.items?.length || 0,
        createdAt: savedReturn.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating test return:', error);
    
    // Provide detailed error information
    let errorDetails = {
      message: error.message,
      name: error.name,
      code: error.code
    };
    
    // Additional details for validation errors
    if (error.name === 'ValidationError' && error.errors) {
      errorDetails.validationErrors = {};
      Object.keys(error.errors).forEach(key => {
        errorDetails.validationErrors[key] = error.errors[key].message;
      });
    }
    
    // Additional details for MongoDB connection errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
      errorDetails.mongodbUriExists = !!process.env.MONGODB_URI;
      if (process.env.MONGODB_URI) {
        errorDetails.uriPrefix = process.env.MONGODB_URI.substring(0, 10) + '...';
      }
    }
    
    return res.status(500).json({
      error: true,
      message: `Error creating test return: ${error.message}`,
      details: errorDetails
    });
  }
}