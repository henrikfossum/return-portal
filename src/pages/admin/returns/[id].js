// src/pages/admin/returns/[id].js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, User, Package, Calendar, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/return/ProductCard';

export default function ReturnDetail() {
  const router = useRouter();
  const { id } = router.query;
  
  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    
    // In a real implementation, fetch this data from your API
    // For MVP, we'll use dummy data
    setTimeout(() => {
      // Simulated return data
      const mockReturn = {
        id: id,
        order_id: '#12345',
        order_number: '12345',
        customer: {
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          phone: '555-123-4567'
        },
        created_at: '2025-02-28T14:30:00Z',
        order_date: '2025-02-20T10:15:00Z',
        status: 'pending',
        items: [
          {
            id: '101',
            title: 'Premium T-Shirt',
            variant_title: 'Blue / Medium',
            quantity: 1,
            price: 29.99,
            return_type: 'return',
            reason: 'Wrong size',
            imageUrl: null, // No image in our mock data
            product_id: 'prod_123'
          },
          {
            id: '102',
            title: 'Designer Jeans',
            variant_title: 'Dark Wash / 32',
            quantity: 1,
            price: 99.99,
            return_type: 'exchange',
            reason: 'Too large',
            imageUrl: null,
            product_id: 'prod_456',
            exchange_details: {
              originalSize: '32',
              newSize: '30',
              originalColor: 'Dark Wash',
              newColor: 'Dark Wash',
              variantId: 'var_789'
            }
          }
        ],
        shipping_address: {
          address1: '123 Main St',
          address2: 'Apt 4B',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US'
        },
        has_returns: true,
        has_exchanges: true,
        total_refund: 129.98,
        history: [
          {
            type: 'created',
            title: 'Return requested',
            timestamp: '2025-02-28T14:30:00Z',
            user: 'Sarah Johnson'
          }
        ],
        admin_notes: ''
      };
      
      setReturnData(mockReturn);
      setLoading(false);
    }, 1000);
  }, [id]);

  // Handle approving the return
  const handleApprove = () => {
    setActionLoading(true);
    
    // In a real implementation, this would make an API call
    setTimeout(() => {
      setReturnData(prev => ({
        ...prev,
        status: 'approved',
        approved_at: new Date().toISOString(),
        admin_notes: adminNotes,
        history: [
          ...prev.history,
          {
            type: 'approved',
            title: 'Return approved',
            timestamp: new Date().toISOString(),
            notes: adminNotes,
            user: 'Admin User'
          }
        ]
      }));
      setActionLoading(false);
    }, 1000);
  };

  // Handle rejecting the return
  const handleReject = () => {
    setActionLoading(true);
    
    // In a real implementation, this would make an API call
    setTimeout(() => {
      setReturnData(prev => ({
        ...prev,
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        admin_notes: adminNotes,
        history: [
          ...prev.history,
          {
            type: 'rejected',
            title: 'Return rejected',
            timestamp: new Date().toISOString(),
            notes: adminNotes,
            user: 'Admin User'
          }
        ]
      }));
      setActionLoading(false);
    }, 1000);
  };

  // Handle marking the return as complete
  const handleComplete = () => {
    setActionLoading(true);
    
    // In a real implementation, this would make an API call
    setTimeout(() => {
      setReturnData(prev => ({
        ...prev,
        status: 'completed',
        completed_at: new Date().toISOString(),
        admin_notes: adminNotes,
        history: [
          ...prev.history,
          {
            type: 'completed',
            title: 'Return completed',
            timestamp: new Date().toISOString(),
            notes: adminNotes,
            user: 'Admin User'
          }
        ]
      }));
      setActionLoading(false);
    }, 1000);
  };

  // Handle flagging the return for review
  const handleFlag = () => {
    setActionLoading(true);
    
    // In a real implementation, this would make an API call
    setTimeout(() => {
      setReturnData(prev => ({
        ...prev,
        status: 'flagged',
        flagged_at: new Date().toISOString(),
        admin_notes: adminNotes,
        history: [
          ...prev.history,
          {
            type: 'flagged',
            title: 'Return flagged for review',
            timestamp: new Date().toISOString(),
            notes: adminNotes,
            user: 'Admin User'
          }
        ]
      }));
      setActionLoading(false);
    }, 1000);
  };

  // Display status badge with appropriate styling
  const StatusBadge = ({ status }) => {
    const statusStyles = {
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      flagged: 'bg-purple-100 text-purple-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900">Return not found</h2>
          <p className="text-gray-500 mt-2">The return you're looking for doesn't exist or has been removed.</p>
          <Link href="/admin/returns">
            <Button className="mt-4" variant="primary">
              Back to Returns
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Return #{id} - Return Portal Admin</title>
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
        {/* Back button */}
        <div className="mb-4">
          <Link href="/admin/returns" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Returns
          </Link>
        </div>
        
        {/* Return header with status and actions */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-lg border border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-semibold text-gray-900">Return #{returnData.id}</h2>
              <StatusBadge status={returnData.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">Submitted {formatDate(returnData.created_at)}</p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
            {returnData.status === 'pending' && (
              <>
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleApprove}
                  isLoading={actionLoading}
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleReject}
                  isLoading={actionLoading}
                  icon={<XCircle className="w-4 h-4" />}
                >
                  Reject
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleFlag}
                  isLoading={actionLoading}
                  icon={<AlertTriangle className="w-4 h-4" />}
                >
                  Flag
                </Button>
              </>
            )}
            
            {returnData.status === 'approved' && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleComplete}
                isLoading={actionLoading}
                icon={<CheckCircle className="w-4 h-4" />}
              >
                Mark Complete
              </Button>
            )}
          </div>
        </div>
        
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Return details - left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer and order info */}
            <Card title="Return Details" padding="normal">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <div className="flex items-start">
                    <User className="w-5 h-5 text-gray-500 mt-0.5 mr-2" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Customer</h3>
                      <p className="text-gray-900">{returnData.customer.name}</p>
                      <p className="text-sm text-gray-500">{returnData.customer.email}</p>
                      {returnData.customer.phone && (
                        <p className="text-sm text-gray-500">{returnData.customer.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-start">
                    <Package className="w-5 h-5 text-gray-500 mt-0.5 mr-2" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Order</h3>
                      <p className="text-gray-900">#{returnData.order_number}</p>
                      <p className="text-sm text-gray-500">
                        Ordered: {formatDate(returnData.order_date)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-start">
                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5 mr-2" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Return Timeline</h3>
                      <p className="text-sm text-gray-500">
                        Requested: {formatDate(returnData.created_at)}
                      </p>
                      {returnData.approved_at && (
                        <p className="text-sm text-gray-500">
                          Approved: {formatDate(returnData.approved_at)}
                        </p>
                      )}
                      {returnData.completed_at && (
                        <p className="text-sm text-gray-500">
                          Completed: {formatDate(returnData.completed_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-start">
                    <RefreshCw className="w-5 h-5 text-gray-500 mt-0.5 mr-2" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Return Type</h3>
                      <div className="flex space-x-3 mt-1">
                        {returnData.has_returns && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                            Return
                          </span>
                        )}
                        {returnData.has_exchanges && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            Exchange
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Shipping address */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Shipping Address</h3>
                <p className="text-gray-900">{returnData.customer.name}</p>
                <p className="text-gray-500">{returnData.shipping_address.address1}</p>
                {returnData.shipping_address.address2 && (
                  <p className="text-gray-500">{returnData.shipping_address.address2}</p>
                )}
                <p className="text-gray-500">
                  {returnData.shipping_address.city}, {returnData.shipping_address.state} {returnData.shipping_address.zip}
                </p>
                <p className="text-gray-500">{returnData.shipping_address.country}</p>
              </div>
            </Card>
            
            {/* Returned items */}
            <Card title="Items" padding="normal">
              <div className="space-y-4">
                {returnData.items.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <ProductCard
                      product={item}
                      showQuantitySelector={false}
                      returnOption={item.return_type}
                    />
                    
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Return Reason</h4>
                          <p className="text-gray-900">{item.reason}</p>
                        </div>
                        
                        {item.return_type === 'exchange' && item.exchange_details && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700">Exchange Details</h4>
                            <div className="text-sm text-gray-600 mt-1">
                              {item.exchange_details.originalSize !== item.exchange_details.newSize && (
                                <p>Size: <span className="line-through">{item.exchange_details.originalSize}</span> → {item.exchange_details.newSize}</p>
                              )}
                              {item.exchange_details.originalColor !== item.exchange_details.newColor && (
                                <p>Color: <span className="line-through">{item.exchange_details.originalColor}</span> → {item.exchange_details.newColor}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          
          {/* Sidebar - right column */}
          <div className="space-y-6">
            {/* Action panel */}
            <Card title="Actions" padding="normal">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Notes
                  </label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    rows="4"
                    placeholder="Add notes about this return..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  ></textarea>
                </div>
                
                {returnData.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="success"
                      fullWidth
                      onClick={handleApprove}
                      isLoading={actionLoading}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      fullWidth
                      onClick={handleReject}
                      isLoading={actionLoading}
                    >
                      Reject
                    </Button>
                  </div>
                )}
                
                {returnData.status === 'approved' && (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleComplete}
                    isLoading={actionLoading}
                  >
                    Mark Complete
                  </Button>
                )}
                
                {returnData.status === 'pending' && (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={handleFlag}
                    isLoading={actionLoading}
                  >
                    Flag for Review
                  </Button>
                )}
              </div>
            </Card>
            
            {/* Return summary */}
            <Card title="Summary" padding="normal">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Items:</span>
                  <span className="text-gray-900">{returnData.items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Refund:</span>
                  <span className="text-gray-900">${returnData.total_refund.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <StatusBadge status={returnData.status} />
                </div>
                {returnData.admin_notes && (
                  <div className="pt-3 mt-3 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700">Admin Notes:</h4>
                    <p className="text-sm text-gray-600 mt-1">{returnData.admin_notes}</p>
                  </div>
                )}
              </div>
            </Card>
            
            {/* Return history */}
            <Card title="History" padding="normal">
              <div className="relative">
                <div className="absolute top-0 bottom-0 left-4 w-px bg-gray-200"></div>
                <ul className="space-y-4">
                  {returnData.history.map((event, index) => (
                    <li key={index} className="relative pl-10">
                      <div className="absolute left-0 top-2 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                        {event.type === 'created' && <Package className="w-4 h-4 text-blue-500" />}
                        {event.type === 'approved' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {event.type === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {event.type === 'rejected' && <XCircle className="w-4 h-4 text-red-500" />}
                        {event.type === 'flagged' && <AlertTriangle className="w-4 h-4 text-purple-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{event.title}</p>
                        <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                        {event.notes && (
                          <p className="text-sm text-gray-600 mt-1">{event.notes}</p>
                        )}
                        {event.user && (
                          <p className="text-xs text-gray-500 mt-1">By: {event.user}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}