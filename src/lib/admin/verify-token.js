// src/pages/api/admin/verify-token.js
import connectToDatabase from '@/lib/db/connection';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Get AdminUser model
let AdminUser;
try {
  AdminUser = mongoose.model('AdminUser');
} catch {
  // Define the schema for the admin user if it doesn't exist
  const AdminUserSchema = new mongoose.Schema({
    name: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'staff'],
      default: 'admin',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  });
  
  AdminUser = mongoose.model('AdminUser', AdminUserSchema);
}

export default async function handler(req, res) {
  // Only allow GET method for token verification
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'default-jwt-secret-replace-in-production'
    );
    
    // Connect to database
    await connectToDatabase();
    
    // Check if the user exists and is active
    const user = await AdminUser.findOne({ 
      _id: decoded.id,
      isActive: true 
    });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }
    
    // Return success with user data
    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    
    // If token is invalid or expired
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    return res.status(500).json({ message: 'Internal server error' });
  }
}