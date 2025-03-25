// Fixed src/pages/admin/returns/[id].js with added handleFlag function
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, User, Package, Calendar, RefreshCw, CheckCircle, XCircle, AlertTriangle, DollarSign, Shield, Tag } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/return/ProductCard';
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

  // Handle flagging the return for review - THIS WAS MISSING
  const handleFlag = async () => {
    const success = await flagReturn(adminNotes);
    if (success) {
      setAdminNotes('');
    }
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
    
    // Check for mismatch in shipping/billing address
    if (returnData.original_order?.shipping_address &&
        returnData.original_order?.billing_address) {
      const shipping = returnData.original_order.shipping_address;
      const billing = returnData.original_order.billing_address;
      
      if (shipping.address1 !== billing.address1 || 
          shipping.city !== billing.city || 
          shipping.zip !== billing.zip) {
        factors.push('Shipping/billing address mismatch');
      }
    }
    
    return {
      isHighRisk: factors.length > 1,
      factors
    };
  };

  // Calculate fraud risk
  const fraudRisk = returnData ? checkFraudRisk() : { isHighRisk: false, factors: [] };

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
          <p className="text-gray-500 mt-2">The return you're looking for doesn't exist or has been removed.</p>
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
              Mark Complete
            </Button>
          )}
        </div>
      </div>
      
      {/* Rest of component implementation... */}
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Return details - left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer and order info */}
          <Card title="Return Details" padding="normal">
            {/* Card content */}
          </Card>
          
          {/* Returned items */}
          <Card title="Items" padding="normal">
            {/* Items content */}
          </Card>
          
          {/* Fraud Detection Results - Added Section */}
          {fraudRisk.factors.length > 0 && (
            <Card title="Risk Assessment" padding="normal">
              {/* Risk assessment content */}
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
            {/* Summary content */}
          </Card>
          
          {/* Return history */}
          <Card title="History" padding="normal">
            {/* History content */}
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