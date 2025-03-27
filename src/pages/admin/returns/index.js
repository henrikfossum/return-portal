// src/pages/admin/returns/index.js
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Search, Filter, Download, AlertTriangle, CheckCircle, Package, RefreshCw, Clock } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AdminLayout from '@/components/admin/Layout';
import { useAdminReturns } from '@/hooks/useAdminReturns';
import ReturnItemCard from '@/components/admin/ReturnItemCard'; // Our new component

export default function ReturnsManagement() {
  const {
    returns,
    loading,
    error,
    filters,
    pagination,
    stats,
    updateFilters,
    changePage,
    fetchReturns
  } = useAdminReturns();

  // Local state for UI enhancements
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'cards'
  const [expandedReturn, setExpandedReturn] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [selectedTab, setSelectedTab] = useState('all'); // 'all', 'flagged', 'pending'

  // Memoize tab selection handler to prevent unnecessary renders
  const handleTabChange = useCallback((tabName) => {
    setSelectedTab(tabName);
    // Wait for React to update the state before calling filter updates
    setTimeout(() => {
      if (tabName === 'all') {
        updateFilters({ status: 'all' });
      } else if (tabName === 'flagged') {
        updateFilters({ status: 'flagged' });
      } else if (tabName === 'pending') {
        updateFilters({ status: 'pending' });
      } else if (tabName === 'manual') {
        // For returns that need manual handling
        updateFilters({ status: 'flagged' });
      }
    }, 0);
  }, [updateFilters]);

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

  // Handle search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
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
    const csv = [headers, ...rows].join('\n');
    
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

  // Toggle expanded return details
  const toggleExpandReturn = (id) => {
    if (expandedReturn === id) {
      setExpandedReturn(null);
    } else {
      setExpandedReturn(id);
    }
  };

  // Get the content for the current selected tab
  const getTabContent = () => {
    // If looking at returns that need manual handling
    if (selectedTab === 'manual') {
      const manualReturns = returns.filter(ret => 
        ret.status === 'flagged' || ret.has_notes || ret.risk_factors?.length > 0
      );

      if (manualReturns.length === 0) {
        return (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Returns Need Attention</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              All returns are being processed automatically or have been handled.
            </p>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
            Returns Requiring Manual Handling
          </h2>

          {manualReturns.map(ret => (
            <div key={ret.id} className="border border-amber-200 rounded-lg overflow-hidden bg-amber-50">
              <div className="bg-white border-b border-amber-200 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Return #{ret.id}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {ret.customer} • {formatDate(ret.date)}
                    </p>
                  </div>
                  <Link href={`/admin/returns/${ret.id}`}>
                    <Button variant="primary" size="sm">
                      Review
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Reason for Manual Review</h4>
                  <div className="space-y-2">
                    {ret.status === 'flagged' && (
                      <div className="flex items-start">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 mr-2" />
                        <p className="text-sm text-gray-800">Return has been flagged for manual review</p>
                      </div>
                    )}
                    {ret.risk_factors?.map((factor, i) => (
                      <div key={i} className="flex items-start">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 mr-2" />
                        <p className="text-sm text-gray-800">{factor}</p>
                      </div>
                    ))}
                    {ret.has_notes && (
                      <div className="flex items-start">
                        <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5 mr-2" />
                        <p className="text-sm text-gray-800">Return has admin notes requiring attention</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Link href={`/admin/returns/${ret.id}`} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                    View details
                    <svg className="w-4 h-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // For regular tabs (all, pending, flagged)
    if (viewMode === 'cards') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {returns.length > 0 ? (
            returns.map((ret) => (
              <Card key={ret.id} padding="normal" className="h-full">
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-gray-600 text-xs">Return #{ret.id}</span>
                      <h3 className="font-medium text-gray-900">{ret.customer}</h3>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium
                      ${ret.status === 'pending' ? 'bg-amber-100 text-amber-800' : ''}
                      ${ret.status === 'approved' ? 'bg-blue-100 text-blue-800' : ''}
                      ${ret.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                      ${ret.status === 'flagged' ? 'bg-purple-100 text-purple-800' : ''}
                      ${ret.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {ret.status.charAt(0).toUpperCase() + ret.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <p>Order: {ret.order_id}</p>
                    <p>Date: {formatDate(ret.date)}</p>
                    <p>Items: {ret.items}</p>
                    <p>Value: ${ret.total.toFixed(2)}</p>
                  </div>
                  
                  <div className="mt-auto pt-3 flex justify-end">
                    <Link href={`/admin/returns/${ret.id}`}>
                      <Button variant="outline" size="sm">View Details</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No returns matching your filters</p>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Return/Order
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
                  <React.Fragment key={ret.id}>
                    <tr className={`hover:bg-gray-50 ${expandedReturn === ret.id ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => toggleExpandReturn(ret.id)}
                          className="text-left focus:outline-none"
                        >
                          <div className="text-sm font-medium text-gray-900">#{ret.id}</div>
                          <div className="text-xs text-gray-500">{ret.order_id}</div>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{ret.customer}</div>
                        <div className="text-xs text-gray-500">{ret.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(ret.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{ret.items} items</div>
                        <div className="text-xs text-gray-500">${ret.total.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium
                          ${ret.status === 'pending' ? 'bg-amber-100 text-amber-800' : ''}
                          ${ret.status === 'approved' ? 'bg-blue-100 text-blue-800' : ''}
                          ${ret.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                          ${ret.status === 'flagged' ? 'bg-purple-100 text-purple-800' : ''}
                          ${ret.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                        `}>
                          {ret.status.charAt(0).toUpperCase() + ret.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/admin/returns/${ret.id}`}>
                          <Button variant="outline" size="xs">View</Button>
                        </Link>
                      </td>
                    </tr>
                    {expandedReturn === ret.id && (
                      <tr className="bg-blue-50">
                        <td colSpan="6" className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Return Details</h4>
                              <div className="text-sm text-gray-600">
                                <p>Status: <span className="font-medium capitalize">{ret.status}</span></p>
                                <p>Date: {formatDate(ret.date)}</p>
                                <p>Total Value: ${ret.total.toFixed(2)}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Customer Information</h4>
                              <div className="text-sm text-gray-600">
                                <p>Name: {ret.customer}</p>
                                <p>Email: {ret.email}</p>
                                <p>Order: {ret.order_id}</p>
                              </div>
                            </div>
                            <div>
                              <Link href={`/admin/returns/${ret.id}`}>
                                <Button variant="primary" size="sm" fullWidth>View Details</Button>
                              </Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                    No returns matching your filters were found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }
  };

  return (
    <AdminLayout title="Returns Management">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Returns Management</h2>
          <p className="text-sm text-gray-500">View and process all return requests.</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <Button 
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || returns.length === 0}
          >
            Export CSV
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'list' ? 'cards' : 'list')}
          >
            {viewMode === 'list' ? 'Card View' : 'List View'}
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card padding="normal" className="bg-blue-50">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700">Total Returns</h3>
              <div className="text-2xl font-semibold text-gray-900">{stats.totalReturns}</div>
            </div>
          </div>
        </Card>
        
        <Card padding="normal" className="bg-amber-50">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-100 mr-4">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700">Pending</h3>
              <div className="text-2xl font-semibold text-gray-900">{stats.pendingReturns}</div>
            </div>
          </div>
        </Card>
        
        <Card padding="normal" className="bg-green-50">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700">Completed</h3>
              <div className="text-2xl font-semibold text-gray-900">{stats.completedReturns}</div>
            </div>
          </div>
        </Card>
        
        <Card padding="normal" className="bg-purple-50">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <AlertTriangle className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700">Flagged</h3>
              <div className="text-2xl font-semibold text-gray-900">{stats.flaggedReturns}</div>
            </div>
          </div>
        </Card>
      </div>
      
      <Card padding="normal">
        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex -mb-px">
            <button
              onClick={() => handleTabChange('all')}
              className={`mr-1 py-2 px-4 text-sm font-medium ${
                selectedTab === 'all'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
              }`}
            >
              All Returns
            </button>
            <button
              onClick={() => handleTabChange('pending')}
              className={`mr-1 py-2 px-4 text-sm font-medium ${
                selectedTab === 'pending'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
              }`}
            >
              Pending ({stats.pendingReturns})
            </button>
            <button
              onClick={() => handleTabChange('flagged')}
              className={`mr-1 py-2 px-4 text-sm font-medium ${
                selectedTab === 'flagged'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
              }`}
            >
              Flagged ({stats.flaggedReturns})
            </button>
            <button
              onClick={() => handleTabChange('manual')}
              className={`mr-1 py-2 px-4 text-sm font-medium ${
                selectedTab === 'manual'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
              }`}
            >
              Needs Manual Handling
            </button>
          </div>
        </div>
      
        {/* Filters and Search */}
        <div className="mb-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <form 
            onSubmit={handleSearchSubmit}
            className="relative flex-grow max-w-md"
          >
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search by order ID, customer name or email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="hidden">Search</button>
          </form>
          
          <div className="flex space-x-3">
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
        
        {/* Loading, Error or Returns Content */}
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
          getTabContent()
        )}
        
        {/* Pagination */}
        {returns.length > 0 && selectedTab !== 'manual' && (
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