// src/components/admin/Header.js
import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { useAdmin } from '@/lib/context/AdminContext';

export default function Header() {
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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link 
              href="/admin" 
              className="flex items-center space-x-2 text-xl font-bold text-gray-800 hover:text-blue-600 transition-colors"
            >
              <LayoutDashboard className="w-6 h-6 text-blue-500" />
              <span>Return Portal</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="flex items-center space-x-3">
              <div 
                className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center 
                           ring-2 ring-blue-200 shadow-sm"
              >
                <span className="text-blue-600 font-semibold text-sm">
                  {getInitial()}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-700">
                  {user?.name || 'Admin User'}
                </p>
                <p className="text-xs text-gray-500">
                  Administrator
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600 transition-colors 
                         p-2 rounded-full hover:bg-red-50 group"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}