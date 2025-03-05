// src/pages/admin/returns/index.js
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Search, Filter, Download } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AdminLayout from '@/components/admin/Layout';
import { useAdminReturns } from '@/hooks/useAdminReturns';

export default function ReturnsManagement() {
  const {
    returns,
    loading,
    error,
    filters,
    pagination,
    updateFilters,
    changePage
  } = useAdminReturns();

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Export as CSV (simplified demo implementation)
  const handleExportCSV = () => {
    if (!returns || returns.length === 0) {
      alert('No returns to export');
      return;
    }
    
    // Create CSV header
    const headers = [
      'ID',
      'Order ID',
      'Customer',
      'Email',
      'Status',
      'Date',
      'Items',
      'Total'
    ].join(',');
    
    // Create CSV rows
    const rows = returns.map(ret => [
      ret.id,
      ret.order_id,
      `"${ret.customer}"`, // Quote to handle commas in names
      ret.email,
      ret.status,
      formatDate(ret.date),
      ret.items,
      ret.total.toFixed(2)
    ].join(','));
    
    // Combine header and rows
    const csv = [headers, ...rows].join('\\n');
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `returns-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="Returns Management">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Returns Management</h2>
          <p className="text-sm text-gray-500">View and process all return requests.</p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <Button 
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || returns.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>
      
      <Card padding="normal">
        {/* Filters and Search */}
        <div className="mb-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search by order ID, customer name or email"
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
            />
          </div>
          
          <div className="flex space-x-3">
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={filters.status}
              onChange={(e) => updateFilters({ status: e.target.value })}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="flagged">Flagged</option>
            </select>
            
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={filters.dateRange}
              onChange={(e) => updateFilters({ dateRange: e.target.value })}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">Last 3 Months</option>
            </select>
          </div>
        </div>
        
        {/* Returns Table */}
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
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
                    Items
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
                {returns.length > 0 ? (
                  returns.map((ret) => (
                    <tr key={ret.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {ret.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ret.order_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {ret.customer}
                          <p className="text-gray-500 text-xs">{ret.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(ret.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ret.items} item{ret.items !== 1 ? 's' : ''}
                        <p className="text-gray-900 text-xs">${ret.total.toFixed(2)}</p>
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
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                      No returns matching your filters were found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {returns.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {returns.length} of {pagination.total} returns
            </div>
            
            <div className="flex space-x-1">
              <button 
                className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                onClick={() => changePage(pagination.current - 1)}
                disabled={pagination.current <= 1 || loading}
              >
                Previous
              </button>
              <button 
                className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                onClick={() => changePage(pagination.current + 1)}
                disabled={pagination.current >= pagination.totalPages || loading}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}