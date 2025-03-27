import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AlertTriangle, User } from 'lucide-react';
import Card from '@/components/ui/Card';
import AdminLayout from '@/components/admin/Layout';
import { useAdmin } from '@/lib/context/AdminContext';

export default function FraudPreventionDashboard() {
  const { authFetch } = useAdmin();
  
  // State for fraud data
  const [fraudData, setFraudData] = useState({
    flaggedReturns: [],
    highRiskCustomers: [],
    stats: {
      totalFlagged: 0,
      highRiskCustomers: 0,
      potentialSavings: 0
    }
  });
  
  // State for UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('30days');
  
  // Memoized helper to calculate potential savings from flagged returns
  const calculatePotentialSavings = useCallback((returnsArray) => {
    return returnsArray.reduce((total, item) => total + (item.total || 0), 0);
  }, []);
  
  // Memoized function to fetch fraud data
  const fetchFraudData = useCallback(async (selectedTimeframe = timeframe) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get analytics data which includes fraud stats
      const response = await authFetch(`/api/admin/analytics?timeframe=${selectedTimeframe}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch fraud data');
      }
      
      const analyticsData = await response.json();
      
      // Get detailed returns data
      const returnsResponse = await authFetch('/api/admin/returns?status=flagged');
      
      if (!returnsResponse.ok) {
        throw new Error('Failed to fetch flagged returns');
      }
      
      const returnsData = await returnsResponse.json();
      
      // Mock some high-risk customers (in a real app, this would be fetched from a database)
      const highRiskCustomers = [
        {
          id: '1',
          name: 'John Smith',
          email: 'john.smith@example.com',
          totalReturns: 8,
          returnRate: 75,
          riskFactors: ['Frequent Returns', 'High Value Returns']
        },
        {
          id: '2',
          name: 'Emily Johnson',
          email: 'emily.johnson@example.com',
          totalReturns: 5,
          returnRate: 83,
          riskFactors: ['New Account', 'Address Mismatch']
        },
        {
          id: '3',
          name: 'David Williams',
          email: 'david.williams@example.com',
          totalReturns: 6,
          returnRate: 60,
          riskFactors: ['Frequent Returns', 'High Value Returns', 'Address Mismatch']
        }
      ];
      
      // Update fraud data
      setFraudData({
        flaggedReturns: returnsData.returns || [],
        highRiskCustomers,
        stats: {
          totalFlagged: returnsData.stats?.flaggedReturns || 0,
          highRiskCustomers: highRiskCustomers.length,
          potentialSavings: calculatePotentialSavings(returnsData.returns || [])
        },
        fraudStats: analyticsData.fraudStats
      });
    } catch (err) {
      console.error('Error fetching fraud data:', err);
      setError(err.message || 'An error occurred while fetching fraud data');
    } finally {
      setLoading(false);
    }
  }, [authFetch, timeframe, calculatePotentialSavings]);
  
  // Load data on mount and when timeframe changes
  useEffect(() => {
    fetchFraudData(timeframe);
  }, [timeframe, fetchFraudData]);
  
  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
  };
  
  // Format currency values
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  // Format date string
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <AdminLayout title="Fraud Prevention">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Fraud Prevention Dashboard</h2>
          <p className="text-sm text-gray-500">Monitor and manage potentially fraudulent return activities</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-2">
          <span className="text-sm text-gray-500 mr-2 hidden sm:inline">Timeframe:</span>
          <select
            value={timeframe}
            onChange={(e) => handleTimeframeChange(e.target.value)}
            className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
            <option value="12months">Last 12 months</option>
          </select>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Flagged Returns Card */}
            <Card padding="normal">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 rounded-md bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Flagged Returns</h3>
                  <span className="text-2xl font-semibold text-gray-900">
                    {fraudData.stats.totalFlagged}
                  </span>
                </div>
              </div>
            </Card>
            
            {/* High-Risk Customers Card */}
            <Card padding="normal">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 rounded-md bg-amber-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-amber-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">High-Risk Customers</h3>
                  <span className="text-2xl font-semibold text-gray-900">
                    {fraudData.stats.highRiskCustomers}
                  </span>
                </div>
              </div>
            </Card>
            
            {/* Potential Savings Card */}
            <Card padding="normal">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 rounded-md bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Potential Savings</h3>
                  <span className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(fraudData.stats.potentialSavings)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Flagged Returns Table */}
          <Card title="Flagged Returns" padding="normal">
            {fraudData.flaggedReturns.length === 0 ? (
              <div className="py-6 text-center text-gray-500">
                No flagged returns found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
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
                        Risk Factors
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {fraudData.flaggedReturns.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.order_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.customer}</div>
                          <div className="text-sm text-gray-500">{item.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {item.risk_factors?.map((factor, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                {factor}
                              </span>
                            )) || <span className="text-gray-500 text-sm">None</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.total || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/admin/returns/${item.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                            View
                          </Link>
                          <a href="#" className="text-red-600 hover:text-red-900">
                            Reject
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          
          {/* High Risk Customers Table */}
          <Card title="High Risk Customers" padding="normal">
            {fraudData.highRiskCustomers.length === 0 ? (
              <div className="py-6 text-center text-gray-500">
                No high-risk customers found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Returns
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Return Rate
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk Factors
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {fraudData.highRiskCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.totalReturns}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.returnRate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {customer.riskFactors.map((factor, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                {factor}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-blue-600 hover:text-blue-900 mr-4"
                            onClick={() => alert(`View customer ${customer.id} details`)}
                          >
                            View Details
                          </button>
                          <button
                            className="text-indigo-600 hover:text-indigo-900"
                            onClick={() => alert(`Mark ${customer.name} for manual review`)}
                          >
                            Flag Account
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          
          {/* Fraud Prevention Tips */}
          <Card title="Fraud Prevention Tips" padding="normal">
            <div className="space-y-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-100 text-blue-600">
                    <span className="text-lg font-bold">1</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">Set Clear Return Policies</h4>
                  <p className="mt-1 text-gray-500">
                    Clearly communicate your return policy to customers, including time limits, condition requirements, and any restocking fees.
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-100 text-blue-600">
                    <span className="text-lg font-bold">2</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">Implement Return Authorization</h4>
                  <p className="mt-1 text-gray-500">
                    Require customers to obtain a return authorization number before returning items, allowing you to track and manage returns.
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-100 text-blue-600">
                    <span className="text-lg font-bold">3</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">Maintain a Customer Return History</h4>
                  <p className="mt-1 text-gray-500">
                    Track customer return patterns to identify frequent returners and potential abusers of your policies.
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-100 text-blue-600">
                    <span className="text-lg font-bold">4</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">Regularly Review Flagged Returns</h4>
                  <p className="mt-1 text-gray-500">
                    Set a schedule to review flagged returns and take appropriate action, such as issuing warnings or adjusting policies for specific customers.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
