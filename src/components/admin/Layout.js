// src/components/admin/Layout.js
import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAdmin } from '@/lib/context/AdminContext';
import Header from './Header';
import Navigation from './Navigation';

export default function AdminLayout({ children, title = 'Admin Dashboard' }) {
  const { isAuthenticated, loading } = useAdmin();
  const router = useRouter();
  
  // Redirect if not authenticated (except login page)
  useEffect(() => {
    if (!loading && !isAuthenticated && router.pathname !== '/admin/login') {
      router.replace('/admin/login');
    }
  }, [loading, isAuthenticated, router]);
  
  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Don't render the layout if not authenticated (except for login page)
  if (!isAuthenticated && router.pathname !== '/admin/login') {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
    <Head>
    <title>{`${title} - Return Portal Admin`}</title>
    </Head>
      
      <Header />
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}