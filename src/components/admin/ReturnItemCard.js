// src/components/admin/ReturnItemCard.js
import React, { useState } from 'react';
import { Package, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Card from '@/components/ui/Card';

export default function ReturnItemCard({ 
  item, 
  status = 'pending',
  showActions = true,
  onApprove = null,
  onReject = null,
  onFlag = null
}) {
  // Track image loading state
  const [imageError, setImageError] = useState(false);
  
  // Helper to format money values
  const formatMoney = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Get appropriate status styles
  const getStatusStyles = () => {
    switch(status) {
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'flagged':
        return 'bg-purple-100 text-purple-800';
      default: // pending
        return 'bg-amber-100 text-amber-800';
    }
  };

  // Get appropriate status icon
  const getStatusIcon = () => {
    switch(status) {
      case 'approved':
        return <RefreshCw className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'flagged':
        return <AlertTriangle className="w-4 h-4" />;
      default: // pending
        return <Package className="w-4 h-4" />;
    }
  };

  // Get image URL or null if none available
  const getImageUrl = () => {
    if (item.image?.src) return item.image.src;
    if (item.imageUrl) return item.imageUrl;
    if (item.variant_image) return item.variant_image;
    if (item.product_image) return item.product_image;
    return null;
  };

  const imageUrl = getImageUrl();
  const price = parseFloat(item.price || 0);
  const quantity = item.quantity || 1;
  const totalPrice = price * quantity;

  return (
    <Card padding="normal" className="overflow-visible">
      <div className="flex">
        {/* Product Image or Icon */}
        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 mr-4 flex items-center justify-center">
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={item.title || item.name || 'Product'}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <Package className="w-8 h-8 text-gray-400" />
          )}
        </div>

        {/* Product Details */}
        <div className="flex-grow">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {item.title || item.name || 'Unknown Product'}
              </h3>
              
              {item.variant_title && (
                <p className="text-xs text-gray-500">{item.variant_title}</p>
              )}
              
              <div className="mt-1 flex items-center">
                <span className="text-xs text-gray-500 mr-2">
                  {formatMoney(price)} × {quantity}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatMoney(totalPrice)}
                </span>
              </div>

              {/* Return Reason */}
              {item.return_reason || item.reason ? (
                <div className="mt-1 text-xs text-gray-500">
                  <span className="font-medium">Reason:</span> {item.return_reason || item.reason}
                </div>
              ) : null}
            </div>

            {/* Status Badge */}
            <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${getStatusStyles()}`}>
              {getStatusIcon()}
              <span className="ml-1 capitalize">{status}</span>
            </div>
          </div>

          {/* Return Type */}
          {item.returnOption && (
            <div className="mt-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                ${item.returnOption === 'exchange' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800'}`}>
                {item.returnOption === 'exchange' ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Exchange
                  </>
                ) : (
                  <>
                    <Package className="w-3 h-3 mr-1" />
                    Return
                  </>
                )}
              </span>
              
              {/* Exchange Details */}
              {item.returnOption === 'exchange' && item.exchangeDetails && (
                <div className="mt-1 text-xs text-gray-600 p-1 bg-blue-50 rounded border border-blue-100">
                  <p>
                    Size: <span className="line-through">{item.exchangeDetails.originalSize}</span> → <span className="font-medium">{item.exchangeDetails.newSize}</span>
                  </p>
                  {item.exchangeDetails.newColor !== item.exchangeDetails.originalColor && (
                    <p>
                      Color: <span className="line-through">{item.exchangeDetails.originalColor}</span> → <span className="font-medium">{item.exchangeDetails.newColor}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons - Only shown when actions are available and showActions is true */}
          {showActions && (status === 'pending' || status === 'flagged') && (
            <div className="mt-2 flex space-x-2">
              {onApprove && (
                <button 
                  onClick={() => onApprove(item.id)}
                  className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 flex items-center"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Approve
                </button>
              )}
              
              {onFlag && (
                <button 
                  onClick={() => onFlag(item.id)}
                  className="px-2 py-1 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 flex items-center"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Flag
                </button>
              )}
              
              {onReject && (
                <button 
                  onClick={() => onReject(item.id)}
                  className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 flex items-center"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Reject
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}