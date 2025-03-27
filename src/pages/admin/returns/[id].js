// src/pages/admin/returns/[id].js
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  ArrowLeft, User, Package, RefreshCw, CheckCircle, 
  XCircle, AlertTriangle, Shield, Truck
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ReturnItemCard from '@/components/admin/ReturnItemCard'; // Our new component
import AdminLayout from '@/components/admin/Layout';
import { useAdminReturnDetail } from '@/hooks/useAdminReturns';

export default function ReturnDetail() {
  const router = useRouter();
  const { id } = router.query;
  
  const {
    returnData,
    loading,
    error,
    actionLoading,
    approveReturn,
    rejectReturn,
    completeReturn,
    flagReturn
  } = useAdminReturnDetail(id);
  
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  // New state for warehouse status
  const [warehouseStatus, setWarehouseStatus] = useState('awaiting'); // awaiting, received, inspected

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

  // Format money values
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Handle approving the return
  const handleApprove = async () => {
    const success = await approveReturn(adminNotes);
    if (success) {
      setAdminNotes('');
    }
  };

  // Handle rejecting the return
  const handleReject = async () => {
    // Combine admin notes with rejection reason
    const notes = `Rejection reason: ${rejectionReason}\n\n${adminNotes}`.trim();
    const success = await rejectReturn(notes);
    if (success) {
      setAdminNotes('');
      setRejectionReason('');
      setShowRejectModal(false);
    }
  };

  // Handle marking the return as complete
  const handleComplete = async () => {
    const success = await completeReturn(adminNotes);
    if (success) {
      setAdminNotes('');
    }
  };

  // Handle flagging the return for manual review
  const handleFlag = async () => {
    const success = await flagReturn(adminNotes);
    if (success) {
      setAdminNotes('');
    }
  };
  
  // Handle warehouse status updates
  const handleWarehouseStatusChange = async (status) => {
    setWarehouseStatus(status);
    // In a real implementation, you would save this to your database
    // and potentially trigger automations based on the new status
    
    // For example, if status is 'received', you might want to:
    if (status === 'received') {
      // Update admin notes
      setAdminNotes(prev => prev + '\nItems received by warehouse on ' + new Date().toLocaleString());
    }
    
    // If status is 'inspected', you might automatically approve if everything is OK
    if (status === 'inspected') {
      // Update admin notes
      setAdminNotes(prev => prev + '\nItems inspected by warehouse on ' + new Date().toLocaleString());
    }
  };

  // Check if return is potentially fraudulent
  const checkFraudRisk = () => {
    if (!returnData) return { isHighRisk: false, factors: [] };
    
    const factors = [];
    
    // Check for multiple returns from same customer
    if (returnData.customer?.returnCount > 3) {
      factors.push('Multiple returns from this customer');
    }
    
    // Check for return outside window
    const orderDate = new Date(returnData.order_date);
    const returnDate = new Date(returnData.created_at);
    const daysBetween = Math.floor((returnDate - orderDate) / (1000 * 60 * 60 * 24));
    
    if (daysBetween > 60) {
      factors.push('Return requested outside normal window');
    }
    
    // Check for high value returns
    if (returnData.total_refund > 300) {
      factors.push('High value return');
    }
    
    return {
      isHighRisk: factors.length > 1,
      factors
    };
  };

  // Calculate fraud risk
  const fraudRisk = returnData ? checkFraudRisk() : { isHighRisk: false, factors: [] };

  // Display status badge with appropriate styling
  const StatusBadge = ({ status }) => {
    const statusStyles = {
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      flagged: 'bg-purple-100 text-purple-800'
    };
    
    const statusIcon = {
      pending: <Package className="w-4 h-4 mr-1" />,
      approved: <RefreshCw className="w-4 h-4 mr-1" />,
      completed: <CheckCircle className="w-4 h-4 mr-1" />,
      rejected: <XCircle className="w-4 h-4 mr-1" />,
      flagged: <AlertTriangle className="w-4 h-4 mr-1" />
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${statusStyles[status] || 'bg-gray-100'}`}>
        {statusIcon[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  
  // Loading state
  if (loading) {
    return (
      <AdminLayout title="Return Details">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AdminLayout title="Return Details">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <h2 className="text-red-800 font-medium">Error Loading Return</h2>
          <p className="text-red-600 mt-1">{error}</p>
          <Link href="/admin/returns">
            <Button className="mt-4" variant="primary">
              Back to Returns
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  if (!returnData) {
    return (
      <AdminLayout title="Return Details">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900">Return not found</h2>
          <p className="text-gray-500 mt-2">The return you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/admin/returns">
            <Button className="mt-4" variant="primary">
              Back to Returns
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Return ${returnData.id}`}>
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
            {fraudRisk.isHighRisk && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1" /> High Risk
              </span>
            )}
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
                onClick={() => setShowRejectModal(true)}
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
                Flag for Review
              </Button>
            </>
          )}
          
          {returnData.status === 'approved' && !returnData.is_fully_refunded && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleComplete}
              isLoading={actionLoading}
              icon={<CheckCircle className="w-4 h-4" />}
            >
              Complete Refund
            </Button>
          )}
        </div>
      </div>
      
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Return details - left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Warehouse Status Tracking - NEW SECTION */}
          <Card title="Warehouse Status" padding="normal">
            <div className="mb-4">
              <div className="relative">
                {/* Status Progress Bar */}
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                  <div 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                    style={{ 
                      width: warehouseStatus === 'awaiting' ? '0%' : 
                             warehouseStatus === 'received' ? '50%' : '100%' 
                    }}
                  ></div>
                </div>
                
                {/* Step Indicators */}
                <div className="flex justify-between text-xs mt-2">
                  <div className={`flex flex-col items-center ${
                    warehouseStatus === 'awaiting' ? 'text-blue-600 font-medium' : 'text-gray-500'
                  }`}>
                    <div className={`rounded-full w-6 h-6 flex items-center justify-center mb-1 ${
                      warehouseStatus === 'awaiting' ? 'bg-blue-100 text-blue-600' : 
                      warehouseStatus === 'received' || warehouseStatus === 'inspected' ? 'bg-green-100 text-green-600' : 'bg-gray-100'
                    }`}>
                      {warehouseStatus === 'received' || warehouseStatus === 'inspected' ? <CheckCircle className="w-3 h-3" /> : 1}
                    </div>
                    Awaiting
                  </div>
                  
                  <div className={`flex flex-col items-center ${
                    warehouseStatus === 'received' ? 'text-blue-600 font-medium' : 'text-gray-500'
                  }`}>
                    <div className={`rounded-full w-6 h-6 flex items-center justify-center mb-1 ${
                      warehouseStatus === 'received' ? 'bg-blue-100 text-blue-600' : 
                      warehouseStatus === 'inspected' ? 'bg-green-100 text-green-600' : 'bg-gray-100'
                    }`}>
                      {warehouseStatus === 'inspected' ? <CheckCircle className="w-3 h-3" /> : 2}
                    </div>
                    Received
                  </div>
                  
                  <div className={`flex flex-col items-center ${
                    warehouseStatus === 'inspected' ? 'text-blue-600 font-medium' : 'text-gray-500'
                  }`}>
                    <div className={`rounded-full w-6 h-6 flex items-center justify-center mb-1 ${
                      warehouseStatus === 'inspected' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
                    }`}>
                      3
                    </div>
                    Inspected
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between space-x-2 mt-6">
              <Button
                variant={warehouseStatus === 'awaiting' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleWarehouseStatusChange('awaiting')}
                icon={<Package className="w-4 h-4" />}
                disabled={warehouseStatus === 'awaiting'}
              >
                Not Received
              </Button>
              
              <Button
                variant={warehouseStatus === 'received' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleWarehouseStatusChange('received')}
                icon={<Truck className="w-4 h-4" />}
                disabled={warehouseStatus === 'received'}
              >
                Mark Received
              </Button>
              
              <Button
                variant={warehouseStatus === 'inspected' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleWarehouseStatusChange('inspected')}
                icon={<CheckCircle className="w-4 h-4" />}
                disabled={warehouseStatus === 'inspected'}
              >
                Mark Inspected
              </Button>
            </div>
            
            {/* Issue Reporting Section */}
            {warehouseStatus === 'inspected' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-800 mb-2">Inspection Issues</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <button
                    className="px-3 py-2 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg text-sm hover:bg-amber-100 flex items-center"
                    onClick={() => {
                      setAdminNotes(prev => prev + '\nItem condition issue detected during inspection');
                      handleFlag();
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" /> 
                    Item Condition Issue
                  </button>
                  
                  <button
                    className="px-3 py-2 border border-red-200 bg-red-50 text-red-800 rounded-lg text-sm hover:bg-red-100 flex items-center"
                    onClick={() => {
                      setRejectionReason('Missing components');
                      setAdminNotes(prev => prev + '\nItems missing components or parts');
                      setShowRejectModal(true);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> 
                    Missing Components
                  </button>
                  
                  <button
                    className="px-3 py-2 border border-purple-200 bg-purple-50 text-purple-800 rounded-lg text-sm hover:bg-purple-100 flex items-center"
                    onClick={() => {
                      setAdminNotes(prev => prev + '\nWrong item returned');
                      handleFlag();
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" /> 
                    Wrong Item Returned
                  </button>
                  
                  <button
                    className="px-3 py-2 border border-green-200 bg-green-50 text-green-800 rounded-lg text-sm hover:bg-green-100 flex items-center"
                    onClick={() => {
                      setAdminNotes(prev => prev + '\nInspection passed - all items in good condition');
                      handleApprove();
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> 
                    Approve & Process
                  </button>
                </div>
              </div>
            )}
          </Card>
          
          {/* Customer and order info */}
          <Card title="Customer Information" padding="normal">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <User className="w-4 h-4 text-gray-500 mr-2" />
                  Customer
                </h4>
                <p className="text-gray-900">{returnData.customer?.name || "Guest Customer"}</p>
                <p className="text-gray-600 text-sm">{returnData.customer?.email || returnData.email}</p>
                {returnData.customer?.phone && (
                  <p className="text-gray-600 text-sm">{returnData.customer.phone}</p>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Package className="w-4 h-4 text-gray-500 mr-2" />
                  Order Details
                </h4>
                <p className="text-gray-900">Order {returnData.order_id}</p>
                <p className="text-gray-600 text-sm">Placed on {formatDate(returnData.order_date)}</p>
                <p className="text-gray-600 text-sm">Return requested on {formatDate(returnData.created_at)}</p>
              </div>
            </div>
            
            {returnData.shipping_address && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Shipping Address</h4>
                <p className="text-gray-900">
                  {returnData.shipping_address.address1}
                  {returnData.shipping_address.address2 && `, ${returnData.shipping_address.address2}`}
                </p>
                <p className="text-gray-900">
                  {returnData.shipping_address.city}, {returnData.shipping_address.province_code} {returnData.shipping_address.zip}
                </p>
                <p className="text-gray-900">{returnData.shipping_address.country}</p>
              </div>
            )}
          </Card>
          
          {/* Returned items */}
          <Card title="Return Items" padding="normal">
            <div className="space-y-4">
              {returnData.items && returnData.items.length > 0 ? (
                returnData.items.map((item) => (
                  <ReturnItemCard
                    key={item.id} 
                    item={item}
                    status={returnData.status}
                    // Only show item-level actions if needed
                    showActions={false}
                  />
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No items found for this return
                </div>
              )}
            </div>
          </Card>
          
          {/* Fraud Detection Results */}
          {fraudRisk.factors.length > 0 && (
            <Card title="Risk Assessment" padding="normal">
              <div className="flex items-start mb-4">
                <div className={`rounded-full p-2 mr-3 flex-shrink-0 ${
                  fraudRisk.isHighRisk ? 'bg-red-100' : 'bg-amber-100'
                }`}>
                  <Shield className={`w-5 h-5 ${
                    fraudRisk.isHighRisk ? 'text-red-500' : 'text-amber-500'
                  }`} />
                </div>
                <div>
                  <h4 className={`font-medium ${
                    fraudRisk.isHighRisk ? 'text-red-800' : 'text-amber-800'
                  }`}>
                    {fraudRisk.isHighRisk ? 'High Risk Return' : 'Potential Risk Factors'}
                  </h4>
                  <p className="text-gray-600 text-sm mt-1">
                    {fraudRisk.isHighRisk 
                      ? 'This return has multiple risk indicators and may require additional verification.'
                      : 'This return has some risk indicators that you may want to review.'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                {fraudRisk.factors.map((factor, index) => (
                  <div key={index} className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mr-2" />
                    <span className="text-gray-700">{factor}</span>
                  </div>
                ))}
              </div>
              
              {fraudRisk.isHighRisk && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2">Suggested Actions</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Verify customer identity and order details</li>
                    <li>Check for previous return history</li>
                    <li>Request photo verification of returned items</li>
                    <li>Consider requiring a return shipping label to be used</li>
                  </ul>
                </div>
              )}
            </Card>
          )}
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
                    onClick={() => setShowRejectModal(true)}
                    isLoading={actionLoading}
                  >
                    Reject
                  </Button>
                </div>
              )}
              
              {returnData.status === 'approved' && !returnData.is_fully_refunded && (
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
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Return Type</span>
                <span className="text-gray-900 font-medium capitalize">
                  {returnData.has_exchanges ? 'Exchange' : 'Return'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Refund</span>
                <span className="text-gray-900 font-medium">
                  {formatMoney(returnData.total_refund || 0)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status</span>
                <StatusBadge status={returnData.status} />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Items</span>
                <span className="text-gray-900 font-medium">
                  {returnData.items?.length || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Processed</span>
                <span className="text-gray-900 font-medium">
                  {returnData.is_fully_refunded ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </Card>
          
          {/* Return history */}
          <Card title="History" padding="normal">
            <div className="space-y-4">
              {returnData.history && returnData.history.length > 0 ? (
                returnData.history.map((event, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 h-4 w-4 mt-1">
                      <div className="h-full w-full rounded-full bg-blue-100 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                      </div>
                    </div>
                    <div className="ml-3 flex-grow">
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                      {event.notes && (
                        <p className="text-xs text-gray-600 mt-1">{event.notes}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No history available</p>
              )}
            </div>
          </Card>
        </div>
      </div>
      
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Return</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rejection Reason
              </label>
              <select
                className="w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              >
                <option value="">Select a reason...</option>
                <option value="Items not in returnable condition">Items not in returnable condition</option>
                <option value="Return window expired">Return window expired</option>
                <option value="Items are final sale">Items are final sale</option>
                <option value="Invalid return request">Invalid return request</option>
                <option value="Items not from original order">Items not from original order</option>
                <option value="Missing components">Missing components</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                className="w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                rows="3"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Provide additional details about the rejection..."
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={!rejectionReason}
                isLoading={actionLoading}
              >
                Reject Return
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}