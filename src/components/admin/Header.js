// src/components/admin/Header.js
import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useAdmin } from '@/lib/context/AdminContext';

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAdmin();
  
  const handleLogout = () => {
    logout();
  };
  
  // Get first letter of name for avatar
  const getInitial = () => {
    if (!user || !user.name) return 'A';
    return user.name.charAt(0).toUpperCase();
  };
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/admin" className="text-xl font-bold text-blue-600">
            Return Portal Admin
          </Link>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">{user?.name || 'Admin User'}</span>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-medium">{getInitial()}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}