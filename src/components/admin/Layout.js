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
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mb-4"></div>
          <p className="text-gray-600 text-sm">Loading Admin Portal...</p>
        </div>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-4">
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}