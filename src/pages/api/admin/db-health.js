// src/pages/api/dev/db-health.js
import connectToDatabase from '@/lib/db/connection';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  // Only allow this endpoint in development mode
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'This endpoint is only available in development mode'
    });
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
    
    // Check for ReturnRequest model
    const hasReturnRequestModel = !!mongoose.models.ReturnRequest;
    
    // Get basic model information without exposing details
    const modelsList = Object.keys(mongoose.models);
    
    // Get database name
    const dbName = mongoose.connection.db?.databaseName || 'Unknown';
    
    // Check MONGODB_URI
    const mongoURIExists = !!process.env.MONGODB_URI;
    const mongoURIPattern = process.env.MONGODB_URI 
      ? process.env.MONGODB_URI.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/, 'mongodb$1://$2:****@')
      : 'Not set';
    
    return res.status(200).json({
      status: 'success',
      connection: {
        state: connectionState,
        stateText: states[connectionState] || 'unknown',
        connected: connectionState === 1,
        database: dbName,
        host: mongoose.connection.host || 'Unknown'
      },
      models: {
        count: modelsList.length,
        list: modelsList,
        hasReturnRequestModel
      },
      environment: {
        node_env: process.env.NODE_ENV,
        mongodb_uri_exists: mongoURIExists,
        mongodb_uri_pattern: mongoURIPattern
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