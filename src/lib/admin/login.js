// src/pages/api/admin/login.js
import connectToDatabase from '@/lib/db/connection';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Make sure we have the AdminUser model
let AdminUser;
try {
  AdminUser = mongoose.model('AdminUser');
} catch {
  // Define the schema for admin user if it doesn't exist
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
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Connect to the database
    await connectToDatabase();

    // Extract email and password from request body
    const { email, password } = req.body;

    // Find the admin user by email
    const user = await AdminUser.findOne({ email, isActive: true });

    // If no user found or password doesn't match, return error
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare the provided password with the stored hash
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create a JWT token for authentication
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'default-jwt-secret-replace-in-production',
      { expiresIn: '7d' }
    );

    // Return token and user data (excluding password)
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}