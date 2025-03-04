// src/components/admin/Layout.js
import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from './Header';
import Navigation from './Navigation';

export default function AdminLayout({ children, title = 'Admin Dashboard' }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{title} - Return Portal Admin</title>
      </Head>
      
      <Header />
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}