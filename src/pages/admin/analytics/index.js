// src/pages/admin/analytics/index.js
import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, AlertTriangle, Calendar, RefreshCw } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AdminLayout from '@/components/admin/Layout';
import { useAdmin } from '@/lib/context/AdminContext';

export default function AnalyticsDashboard() {
  const { authFetch } = useAdmin();
  
  // State for analytics data
  const [analyticsData, setAnalyticsData] = useState({
    summary: {
      totalOrders: 0,
      totalReturns: 0,
      returnRate: 0,
      totalReturnValue: 0
    },
    timeline: [],
    reasons: [],
    timeframe: '30days'
  });
  
  // State for UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('30days');
  
  // Fetch analytics data
  const fetchAnalytics = async (selectedTimeframe = timeframe) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authFetch(`/api/admin/analytics?timeframe=${selectedTimeframe}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'An error occurred while fetching analytics data');
    } finally {
      setLoading(false);
    }
  };
  
  // Load data on mount and when timeframe changes
  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe, authFetch]);
  
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
  
  // Generate chart colors
  const getChartColors = (index) => {
    const colors = [
      '#3b82f6', // blue-500
      '#10b981', // emerald-500
      '#f97316', // orange-500
      '#ec4899', // pink-500
      '#8b5cf6', // purple-500
      '#ef4444', // red-500
      '#f59e0b', // amber-500
      '#0ea5e9', // sky-500
    ];
    
    return colors[index % colors.length];
  };
  
  // Generate summary data
  const getSummaryData = () => {
    return [
      {
        title: 'Total Orders',
        value: analyticsData.summary.totalOrders,
        icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
      },
      {
        title: 'Total Returns',
        value: analyticsData.summary.totalReturns,
        icon: <RefreshCw className="w-6 h-6 text-amber-600" />,
      },
      {
        title: 'Return Rate',
        value: `${analyticsData.summary.returnRate}%`,
        icon: <PieChart className="w-6 h-6 text-green-600" />,
      },
      {
        title: 'Return Value',
        value: formatCurrency(analyticsData.summary.totalReturnValue),
        icon: <TrendingUp className="w-6 h-6 text-purple-600" />,
      }
    ];
  };
  
  // Find max value for the timeline data
  const getMaxTimelineValue = () => {
    const returnRates = analyticsData.timeline.map(t => parseFloat(t.returnRate.toFixed(2)));
    return Math.max(...returnRates, 10); // Minimum of 10% for scale
  };
  
  // Find max returns count for timeline data
  const getMaxReturnsCount = () => {
    const returnCounts = analyticsData.timeline.map(t => t.returns);
    return Math.max(...returnCounts, 10); // Minimum of 10 for scale
  };
  
  return (
    <AdminLayout title="Analytics Dashboard">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm text-gray-500">Monitor returns performance and identify trends</p>
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
          
          <Button
            variant="outline"
            onClick={() => fetchAnalytics(timeframe)}
            icon={<RefreshCw className="w-4 h-4" />}
            size="sm"
          >
            Refresh
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {/* Loading or render content */}
      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {getSummaryData().map((item, index) => (
              <Card key={index} padding="normal">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-12 w-12 rounded-md bg-blue-100 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">{item.title}</h3>
                    <span className="text-2xl font-semibold text-gray-900">{item.value}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Timeline Visualization (simple bar chart) */}
            <Card title="Return Rate Over Time" padding="normal">
              <div className="p-4 h-80">
                {analyticsData.timeline.length > 0 ? (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 flex items-end space-x-2">
                      {analyticsData.timeline.map((month, index) => {
                        const returnRate = parseFloat(month.returnRate.toFixed(2));
                        const maxRate = getMaxTimelineValue();
                        const height = (returnRate / maxRate) * 100;
                        
                        return (
                          <div 
                            key={index} 
                            className="flex-1 flex flex-col items-center group"
                          >
                            <div className="w-full flex justify-center mb-2">
                              <div 
                                className="bg-blue-500 rounded-t w-full" 
                                style={{ height: `${height}%`, minHeight: '4px' }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 truncate w-full text-center">
                              {month.month}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-gray-800 text-white text-xs rounded p-1 pointer-events-none">
                              {returnRate}% ({month.returns} returns)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 text-xs text-gray-500 text-center">Month</div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No timeline data available
                  </div>
                )}
              </div>
            </Card>
            
            {/* Reasons Visualization (simple bars) */}
            <Card title="Top Return Reasons" padding="normal">
              <div className="p-4 h-80">
                {analyticsData.reasons.length > 0 ? (
                  <div className="flex flex-col h-full space-y-4 overflow-y-auto">
                    {analyticsData.reasons.map((reason, index) => {
                      const total = analyticsData.reasons.reduce((sum, r) => sum + r.count, 0);
                      const percentage = Math.round((reason.count / total) * 100);
                      
                      return (
                        <div key={index} className="flex flex-col">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{reason.reason}</span>
                            <span className="text-sm text-gray-500">{reason.count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="h-2.5 rounded-full" 
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: getChartColors(index)
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No return reasons data available
                  </div>
                )}
              </div>
            </Card>
          </div>
          
          {/* Fraud Prevention Card */}
          <Card title="Fraud Prevention Insights" padding="normal">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 mr-2" />
                  <div>
                    <h4 className="font-medium text-amber-800">High-Risk Returns</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      {analyticsData.fraudStats?.highRiskCount || 0} potential high-risk returns detected
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start">
                  <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                  <div>
                    <h4 className="font-medium text-blue-800">Repeat Returners</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {analyticsData.fraudStats?.repeatReturners || 0} customers with multiple returns
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-purple-500 mt-0.5 mr-2" />
                  <div>
                    <h4 className="font-medium text-purple-800">Return Rate Change</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      {analyticsData.fraudStats?.rateChange > 0 ? '+' : ''}{analyticsData.fraudStats?.rateChange || 0}% from previous period
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {analyticsData.flaggedReturns && analyticsData.flaggedReturns.length > 0 && (
              <div className="mt-4 p-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Recently Flagged Returns</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Risk Factors
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analyticsData.flaggedReturns.map((flagged) => (
                        <tr key={flagged.id}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {flagged.order_id}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {flagged.customer}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            <div className="flex flex-wrap gap-1">
                              {flagged.risk_factors.map((factor, i) => (
                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  {factor}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(flagged.value)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            <a 
                              href={`/admin/returns/${flagged.id}`} 
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Details
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}