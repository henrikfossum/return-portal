// src/pages/api/admin/db-health.js
import connectToDatabase from '@/lib/db/connection';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

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

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ 
      error: 'Method Not Allowed', 
      message: `Method ${req.method} is not allowed` 
    });
  }

  try {
    // Attempt to connect to the database
    console.log('Testing database connection...');
    await connectToDatabase();
    
    // Get connection status
    const connectionState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized'
    };
    
    // Get model information
    const modelInfo = {};
    Object.keys(mongoose.models).forEach(modelName => {
      const model = mongoose.models[modelName];
      modelInfo[modelName] = {
        modelName,
        collectionName: model.collection.name,
        schema: Object.keys(model.schema.paths)
      };
    });
    
    // Get database name
    const dbName = mongoose.connection.db?.databaseName || 'Unknown';
    
    return res.status(200).json({
      status: 'success',
      connection: {
        state: connectionState,
        stateText: states[connectionState] || 'unknown',
        connected: connectionState === 1,
        database: dbName,
        host: mongoose.connection.host || 'Unknown'
      },
      models: modelInfo,
      environment: {
        node_env: process.env.NODE_ENV,
        mongodb_uri_exists: !!process.env.MONGODB_URI
      }
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}