// src/components/admin/Navigation.js
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navigation() {
  const router = useRouter();
  
  const isActive = (path) => {
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  };
  
  return (
    <nav className="bg-white shadow-sm border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          <Link 
            href="/admin" 
            className={`border-b-2 px-1 py-4 text-sm font-medium 
              ${isActive('/admin') && !isActive('/admin/returns') && !isActive('/admin/analytics') && !isActive('/admin/settings')
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent hover:border-gray-300 text-gray-500 hover:text-gray-700'}`}
          >
            Dashboard
          </Link>
          <Link 
            href="/admin/returns" 
            className={`border-b-2 px-1 py-4 text-sm font-medium 
              ${isActive('/admin/returns') 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent hover:border-gray-300 text-gray-500 hover:text-gray-700'}`}
          >
            Returns
          </Link>
          <Link 
            href="/admin/analytics" 
            className={`border-b-2 px-1 py-4 text-sm font-medium 
              ${isActive('/admin/analytics') 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent hover:border-gray-300 text-gray-500 hover:text-gray-700'}`}
          >
            Analytics
          </Link>
          <Link 
            href="/admin/settings" 
            className={`border-b-2 px-1 py-4 text-sm font-medium 
              ${isActive('/admin/settings') 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent hover:border-gray-300 text-gray-500 hover:text-gray-700'}`}
          >
            Settings
          </Link>
        </div>
      </div>
    </nav>
  );
}