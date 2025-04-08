// src/pages/api/health/db-check.js
import connectToDatabase from '@/lib/db/connection';
import mongoose from 'mongoose';

// This is a simple API key approach - in a real production app, 
// you might want to use environment variables for this
const API_KEY = 'return_portal_health_check_key';

export default async function handler(req, res) {
  // Check for API key in query parameter
  const providedKey = req.query.key;
  
  if (!providedKey || providedKey !== API_KEY) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Invalid or missing API key'
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
    
    // Get model information if requested
    let modelInfo = { count: Object.keys(mongoose.models).length };
    if (req.query.details === 'true') {
      modelInfo.list = {};
      Object.keys(mongoose.models).forEach(modelName => {
        try {
          const model = mongoose.models[modelName];
          modelInfo.list[modelName] = {
            collectionName: model.collection.name,
            schema: Object.keys(model.schema.paths)
          };
        } catch (err) {
          modelInfo.list[modelName] = {error: err.message};
        }
      });
    } else {
      modelInfo.models = Object.keys(mongoose.models);
    }
    
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
        ...modelInfo,
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
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      mongoURI_exists: !!process.env.MONGODB_URI
    });
  }
}