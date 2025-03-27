// src/pages/admin/index.js
import React from 'react';
import { Package, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import AdminLayout from '@/components/admin/Layout';
import { useAdminReturns } from '@/hooks/useAdminReturns';

export default function AdminDashboard() {
  const { returns, stats, loading, error } = useAdminReturns();
  
  // Take only the most recent 5 returns
  const recentReturns = returns.slice(0, 5);

  return (
    <AdminLayout title="Dashboard">
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
        ) : error ? (
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
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
                {recentReturns.length > 0 ? (
                  recentReturns.map((ret) => (
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
                        {new Date(ret.date).toLocaleDateString()}
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
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                      No returns found
                    </td>
                  </tr>
                )}
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
    </AdminLayout>
  );
}