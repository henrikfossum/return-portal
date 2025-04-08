// src/pages/api/diagnostics.js
import connectToDatabase from '@/lib/db/connection';
import mongoose from 'mongoose';
import ReturnRequest from '@/lib/db/models/ReturnRequest';

export default async function handler(req, res) {
  console.log('🔍 Starting database diagnostics...');
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongodb_uri_exists: !!process.env.MONGODB_URI,
    mongodb_uri_pattern: process.env.MONGODB_URI 
      ? process.env.MONGODB_URI.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/, 'mongodb$1://$2:****@')
      : 'Not set',
    connection: {
      attempted: false,
      success: false,
      error: null
    },
    models: {
      returnRequestExists: false,
      models: []
    },
    test_save: {
      attempted: false,
      success: false,
      error: null,
      document: null
    }
  };
  
  // Check models before connection
  try {
    diagnostics.models.returnRequestExists = !!mongoose.models.ReturnRequest;
    diagnostics.models.models = Object.keys(mongoose.models);
  } catch (error) {
    console.error('Error checking models:', error);
  }
  
  // Try connecting to database
  try {
    console.log('Attempting database connection...');
    diagnostics.connection.attempted = true;
    
    await connectToDatabase();
    
    diagnostics.connection.success = true;
    diagnostics.connection.state = mongoose.connection.readyState;
    diagnostics.connection.stateText = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
    
    console.log(`Database connection result: ${diagnostics.connection.stateText}`);
    
    // Check models after connection
    diagnostics.models.returnRequestExists = !!mongoose.models.ReturnRequest;
    diagnostics.models.models = Object.keys(mongoose.models);
    
    // Try to create a test document
    if (diagnostics.connection.success) {
      try {
        console.log('Attempting to create test document...');
        diagnostics.test_save.attempted = true;
        
        const testReturn = new ReturnRequest({
          orderId: 'DIAGNOSTIC-TEST-' + Date.now(),
          orderNumber: 'DIAGNOSTIC-TEST-' + Date.now(),
          shopifyOrderId: 'test-' + Date.now(),
          customer: {
            name: 'Test Customer',
            email: 'test@example.com'
          },
          status: 'pending',
          items: [{
            id: 'item-' + Date.now(),
            title: 'Test Item',
            quantity: 1,
            returnOption: 'return',
            returnReason: {
              reason: 'Diagnostic Test',
              additionalInfo: 'This is a test document created by the diagnostic endpoint'
            }
          }],
          tenantId: 'default',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Save the test document
        const savedTest = await testReturn.save();
        diagnostics.test_save.success = true;
        diagnostics.test_save.document = {
          id: savedTest._id.toString(),
          orderId: savedTest.orderId,
          status: savedTest.status
        };
        
        console.log('Test document created successfully:', savedTest._id);
        
        // Delete the test document to clean up
        await ReturnRequest.deleteOne({ _id: savedTest._id });
        console.log('Test document deleted successfully');
      } catch (saveError) {
        console.error('Error saving test document:', saveError);
        diagnostics.test_save.success = false;
        diagnostics.test_save.error = {
          message: saveError.message,
          name: saveError.name,
          code: saveError.code
        };
      }
    }
  } catch (connError) {
    console.error('Connection error:', connError);
    diagnostics.connection.success = false;
    diagnostics.connection.error = {
      message: connError.message,
      name: connError.name,
      code: connError.code
    };
  }
  
  // Return the diagnostic results
  return res.status(200).json(diagnostics);
}