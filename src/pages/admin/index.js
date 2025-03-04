// src/pages/admin/index.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Package, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalReturns: 0,
    pendingReturns: 0,
    completedReturns: 0,
    flaggedReturns: 0
  });
  
  const [recentReturns, setRecentReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, fetch this data from your API
    // For MVP, we'll use dummy data
    setTimeout(() => {
      setStats({
        totalReturns: 157,
        pendingReturns: 23,
        completedReturns: 89,
        flaggedReturns: 3
      });
      
      setRecentReturns([
        { id: '1001', order_id: '#12345', customer: 'Sarah Johnson', date: '2025-02-28', status: 'pending', items: 2 },
        { id: '1002', order_id: '#12346', customer: 'Michael Chen', date: '2025-02-27', status: 'approved', items: 1 },
        { id: '1003', order_id: '#12347', customer: 'Emma Davis', date: '2025-02-25', status: 'completed', items: 3 },
        { id: '1004', order_id: '#12348', customer: 'John Smith', date: '2025-02-24', status: 'flagged', items: 1 },
        { id: '1005', order_id: '#12349', customer: 'Lisa Rodriguez', date: '2025-02-23', status: 'completed', items: 2 }
      ]);
      
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Return Portal Admin</title>
      </Head>
      
      {/* Admin Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-blue-600">Return Portal Admin</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Admin User</span>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-medium">A</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Admin Navigation */}
      <nav className="bg-white shadow-sm border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/admin" className="border-b-2 border-blue-500 text-blue-600 px-1 py-4 text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/admin/returns" className="border-b-2 border-transparent hover:border-gray-300 text-gray-500 hover:text-gray-700 px-1 py-4 text-sm font-medium">
              Returns
            </Link>
            <Link href="/admin/analytics" className="border-b-2 border-transparent hover:border-gray-300 text-gray-500 hover:text-gray-700 px-1 py-4 text-sm font-medium">
              Analytics
            </Link>
            <Link href="/admin/settings" className="border-b-2 border-transparent hover:border-gray-300 text-gray-500 hover:text-gray-700 px-1 py-4 text-sm font-medium">
              Settings
            </Link>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900">Dashboard Overview</h2>
          <p className="text-sm text-gray-500">Manage and monitor all return requests.</p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card padding="normal">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 rounded-md bg-blue-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Returns</h3>
                <span className="text-2xl font-semibold text-gray-900">
                  {loading ? '-' : stats.totalReturns}
                </span>
              </div>
            </div>
          </Card>
          
          <Card padding="normal">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 rounded-md bg-amber-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Pending</h3>
                <span className="text-2xl font-semibold text-gray-900">
                  {loading ? '-' : stats.pendingReturns}
                </span>
              </div>
            </div>
          </Card>
          
          <Card padding="normal">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 rounded-md bg-green-100 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Completed</h3>
                <span className="text-2xl font-semibold text-gray-900">
                  {loading ? '-' : stats.completedReturns}
                </span>
              </div>
            </div>
          </Card>
          
          <Card padding="normal">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 rounded-md bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Flagged</h3>
                <span className="text-2xl font-semibold text-gray-900">
                  {loading ? '-' : stats.flaggedReturns}
                </span>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Recent Returns Table */}
        <Card title="Recent Returns" padding="normal">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentReturns.map((ret) => (
                    <tr key={ret.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {ret.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ret.order_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ret.customer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ret.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium
                          ${ret.status === 'pending' ? 'bg-amber-100 text-amber-800' : ''}
                          ${ret.status === 'approved' ? 'bg-blue-100 text-blue-800' : ''}
                          ${ret.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                          ${ret.status === 'flagged' ? 'bg-purple-100 text-purple-800' : ''}
                        `}>
                          {ret.status.charAt(0).toUpperCase() + ret.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Link href={`/admin/returns/${ret.id}`}>
                          <Button variant="outline" size="xs">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="mt-4">
            <Link href="/admin/returns">
              <Button 
                variant="outline" 
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                View All Returns
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}