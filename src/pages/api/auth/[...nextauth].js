// src/pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import connectToDatabase from '@/lib/db/connection';
import mongoose from 'mongoose';

// Create Admin user model if it doesn't exist yet
let AdminUser;
try {
  AdminUser = mongoose.model('AdminUser');
} catch {
  // Define the schema for the admin user
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

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          // Connect to database
          await connectToDatabase();
          
          // Find user
          const user = await AdminUser.findOne({ email: credentials.email, isActive: true });
          
          // If no user found
          if (!user) {
            return null;
          }
          
          // Check password
          const passwordMatch = await bcrypt.compare(credentials.password, user.password);
          
          if (!passwordMatch) {
            return null;
          }
          
          // Return user object without password
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Add user properties to JWT token
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Add properties from token to session
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    }
  },
  pages: {
    signIn: '/admin/login', // Custom login page
    error: '/admin/login', // Error page for authentication
  },
  debug: process.env.NODE_ENV === 'development',
});