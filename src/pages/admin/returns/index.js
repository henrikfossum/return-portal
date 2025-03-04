// src/pages/admin/returns/index.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Search, Filter, Download } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function ReturnsManagement() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    // In a real implementation, fetch this data from your API
    // For MVP, we'll use dummy data
    setTimeout(() => {
      setReturns([
        { id: '1001', order_id: '#12345', customer: 'Sarah Johnson', email: 'sarah@example.com', date: '2025-02-28', status: 'pending', items: 2, total: 129.99 },
        { id: '1002', order_id: '#12346', customer: 'Michael Chen', email: 'michael@example.com', date: '2025-02-27', status: 'approved', items: 1, total: 79.99 },
        { id: '1003', order_id: '#12347', customer: 'Emma Davis', email: 'emma@example.com', date: '2025-02-25', status: 'completed', items: 3, total: 199.99 },
        { id: '1004', order_id: '#12348', customer: 'John Smith', email: 'john@example.com', date: '2025-02-24', status: 'flagged', items: 1, total: 249.99 },
        { id: '1005', order_id: '#12349', customer: 'Lisa Rodriguez', email: 'lisa@example.com', date: '2025-02-23', status: 'completed', items: 2, total: 149.99 },
        { id: '1006', order_id: '#12350', customer: 'David Wilson', email: 'david@example.com', date: '2025-02-22', status: 'pending', items: 1, total: 89.99 },
        { id: '1007', order_id: '#12351', customer: 'Patricia Brown', email: 'patricia@example.com', date: '2025-02-21', status: 'completed', items: 2, total: 159.99 },
        { id: '1008', order_id: '#12352', customer: 'Robert Taylor', email: 'robert@example.com', date: '2025-02-20', status: 'approved', items: 3, total: 219.99 },
        { id: '1009', order_id: '#12353', customer: 'Jennifer Garcia', email: 'jennifer@example.com', date: '2025-02-19', status: 'pending', items: 1, total: 69.99 },
        { id: '1010', order_id: '#12354', customer: 'James Martinez', email: 'james@example.com', date: '2025-02-18', status: 'completed', items: 4, total: 299.99 }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter returns based on search term and filters
  const filteredReturns = returns.filter(ret => {
    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      ret.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.order_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status
    const matchesStatus = statusFilter === 'all' || ret.status === statusFilter;
    
    // Filter by date (simplified for MVP)
    const matchesDate = dateFilter === 'all'; // In a real app, implement proper date filtering
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Returns Management - Return Portal Admin</title>
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
            <Link href="/admin" className="border-b-2 border-transparent hover:border-gray-300 text-gray-500 hover:text-gray-700 px-1 py-4 text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/admin/returns" className="border-b-2 border-blue-500 text-blue-600 px-1 py-4 text-sm font-medium">
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex space-x-3">
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="flagged">Flagged</option>
              </select>
              
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
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
                  {filteredReturns.map((ret) => (
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
                        {ret.date}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {filteredReturns.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500">No returns matching your filters were found.</p>
            </div>
          )}
          
          {/* Simple pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {filteredReturns.length} of {returns.length} returns
            </div>
            
            <div className="flex space-x-1">
              <button className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                Previous
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}