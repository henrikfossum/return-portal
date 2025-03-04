// src/lib/admin/withAdminAuth.js
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function withAdminAuth(Component) {
  return function WithAdminAuth(props) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // For MVP: Check if admin is logged in (use localStorage)
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        // Redirect to login page
        router.replace('/admin/login');
      } else {
        setIsAuthenticated(true);
      }
      
      setIsLoading(false);
    }, [router]);

    if (isLoading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!isAuthenticated) {
      return null; // Don't render anything while redirecting
    }

    return <Component {...props} />;
  };
}

// Then use it in each admin page:
// export default withAdminAuth(AdminDashboard);