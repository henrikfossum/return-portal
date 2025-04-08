// src/lib/db/connection.js - Improved version
import mongoose from 'mongoose';

// Get MongoDB URI from environment variable
const MONGODB_URI = process.env.MONGODB_URI;

// More detailed error handling
if (!MONGODB_URI) {
  console.error('MongoDB URI is missing. Please set the MONGODB_URI environment variable.');
  // In development, provide guidance
  if (process.env.NODE_ENV === 'development') {
    console.error(`
      Add the following to your .env.local file:
      MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
    `);
  }
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local or in your environment config'
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  // Log connection attempt
  console.log('Attempting to connect to MongoDB...');
  
  if (cached.conn) {
    console.log('Using existing MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    // Log connection details (redacted for security)
    const redactedURI = MONGODB_URI.replace(
      /mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/,
      'mongodb$1://$2:****@'
    );
    console.log(`Connecting to MongoDB: ${redactedURI}`);

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then(mongoose => {
        console.log('Connected to MongoDB successfully');
        return mongoose;
      })
      .catch(err => {
        console.error('MongoDB connection error:', err);
        // More detailed error handling
        if (err.name === 'MongoNetworkError') {
          console.error('Network error connecting to MongoDB. Check your network or MongoDB URI.');
        } else if (err.name === 'MongoServerSelectionError') {
          console.error('Could not select MongoDB server. The server might be down or the URI might be incorrect.');
        } else if (err.name === 'MongoError' && err.code === 18) {
          console.error('MongoDB authentication failed. Check your username and password.');
        }
        throw err;
      });
  }
  
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error('Failed to establish MongoDB connection:', error);
    throw error;
  }
}

export default connectToDatabase;