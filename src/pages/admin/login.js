// src/pages/admin/login.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAdmin } from '@/lib/context/AdminContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { login, isAuthenticated, loading, error } = useAdmin();
  
  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated && !loading) {
      router.replace('/admin');
    }
  }, [isAuthenticated, loading, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    const success = await login(email, password);
    if (success) {
      router.push('/admin');
    }
  };

  // If already authenticated, don't render login form
  if (isAuthenticated && !loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Head>
        <title>Admin Login - Return Portal</title>
      </Head>
      
      <div className="w-full max-w-md p-4">
        <Card title="Admin Login" padding="large" elevation="medium">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="admin@example.com"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">For demo: admin@example.com</p>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="password123"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">For demo: password123</p>
              </div>
            </div>
            
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={loading}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}