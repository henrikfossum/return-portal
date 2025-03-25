// src/components/admin/Navigation.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, 
  Package, // Use Package instead of PackageReturn
  BarChart3, 
  Settings 
} from 'lucide-react';


export default function Navigation() {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(router.pathname);
  }, [router.pathname]);
  
  const isActive = (path) => {
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };
  
  const navItems = [
    { 
      href: "/admin", 
      label: "Dashboard", 
      icon: LayoutDashboard,
      isActive: isActive('/admin') && 
        !isActive('/admin/returns') && 
        !isActive('/admin/analytics') && 
        !isActive('/admin/settings')
    },
    { 
      href: "/admin/returns", 
      label: "Returns", 
      icon: Package, // Changed from PackageReturn
      isActive: isActive('/admin/returns')
    },
    { 
      href: "/admin/analytics", 
      label: "Analytics", 
      icon: BarChart3,
      isActive: isActive('/admin/analytics')
    },
    { 
      href: "/admin/settings", 
      label: "Settings", 
      icon: Settings,
      isActive: isActive('/admin/settings')
    }
  ];
  
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-16 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`
                  flex items-center space-x-2 px-3 py-3 text-sm font-medium 
                  transition-all duration-200 group
                  ${item.isActive 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'}
                `}
              >
                <IconComponent 
                  className={`w-5 h-5 
                    ${item.isActive 
                      ? 'text-blue-600' 
                      : 'text-gray-400 group-hover:text-gray-600'}`} 
                />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}