// src/components/admin/Navigation.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, 
  Package,
  BarChart3, 
  Settings,
  Palette
} from 'lucide-react';
import { useTheme } from '@/lib/context/ThemeContext';

export default function Navigation() {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState('');
  const { theme } = useTheme();

  useEffect(() => {
    setCurrentPath(router.pathname);
  }, [router.pathname]);
  
  const isActive = (path) => {
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };
  
  // Get theme colors or fallback values
  const primaryColor = theme?.primaryColor || '#4f46e5';
  const textColor = theme?.textColor || '#111827';
  const borderColor = theme?.borderColor || '#e5e7eb';
  
  const navItems = [
    { 
      href: "/admin", 
      label: "Dashboard", 
      icon: LayoutDashboard,
      isActive: isActive('/admin') && 
        !isActive('/admin/returns') && 
        !isActive('/admin/analytics') && 
        !isActive('/admin/settings') &&
        !isActive('/admin/theme-customization')
    },
    { 
      href: "/admin/returns", 
      label: "Returns", 
      icon: Package,
      isActive: isActive('/admin/returns')
    },
    { 
      href: "/admin/analytics", 
      label: "Analytics", 
      icon: BarChart3,
      isActive: isActive('/admin/analytics')
    },
    { 
      href: "/admin/theme-customization", 
      label: "Theme", 
      icon: Palette,
      isActive: isActive('/admin/theme-customization')
    },
    { 
      href: "/admin/settings", 
      label: "Settings", 
      icon: Settings,
      isActive: isActive('/admin/settings')
    }
  ];
  
  return (
    <nav className="bg-white border-b sticky top-16 z-30" style={{ borderColor }}>
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
                  ${item.isActive ? 'border-b-2' : 'hover:border-b-2 hover:border-gray-300'}
                `}
                style={{
                  color: item.isActive ? primaryColor : (theme?.secondaryTextColor || '#6b7280'),
                  borderColor: item.isActive ? primaryColor : 'transparent'
                }}
              >
                <IconComponent 
                  className="w-5 h-5" 
                  style={{ 
                    color: item.isActive ? primaryColor : (theme?.secondaryTextColor || '#6b7280') 
                  }}
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