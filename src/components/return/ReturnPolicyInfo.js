// src/components/return/ReturnPolicyInfo.js
import React, { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp, Info, Clock, RefreshCw, DollarSign } from 'lucide-react';
import { useTenantTheme } from '@/lib/tenant/hooks';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReturnPolicyInfo({ 
  settings = {},
  order = null,
  eligibleItems = [],
  ineligibleItems = [],
  className = ''
}) {
  const { theme } = useTenantTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Extract return window days from settings
  const returnWindowDays = settings.returnWindowDays || 30;
  
  // Calculate days remaining in return window if order is available
  let daysRemaining = null;
  let isWithinWindow = true;
  
  if (order && order.processed_at) {
    const orderDate = new Date(order.processed_at);
    const now = new Date();
    const daysSinceOrder = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
    daysRemaining = returnWindowDays - daysSinceOrder;
    isWithinWindow = daysRemaining > 0;
  }
  
  // Count eligible vs ineligible items
  const totalItems = (eligibleItems?.length || 0) + (ineligibleItems?.length || 0);
  const eligibleCount = eligibleItems?.length || 0;
  const ineligibleCount = ineligibleItems?.length || 0;
  
  // Detect if this is an order-specific policy or general
  const isOrderSpecific = !!order;
  
  return (
    <div className={`rounded-lg border overflow-hidden ${className}`}>
      {/* Summary bar - always visible */}
      <button
        className={`w-full p-4 text-left flex items-center justify-between 
                   ${isWithinWindow ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          {isOrderSpecific ? (
            <Clock 
              className={`w-5 h-5 mr-2 ${isWithinWindow ? 'text-blue-600' : 'text-yellow-600'}`} 
            />
          ) : (
            <Info 
              className="w-5 h-5 mr-2 text-blue-600" 
            />
          )}
          <div>
            <h3 className="font-medium text-gray-900">
              {isOrderSpecific ? (
                isWithinWindow ? (
                  `Return Window: ${daysRemaining} days remaining`
                ) : (
                  `Return Window: Expired (${Math.abs(daysRemaining)} days overdue)`
                )
              ) : (
                'Return Policy Information'
              )}
            </h3>
            
            {isOrderSpecific && totalItems > 0 && (
              <p className="text-xs text-gray-600 mt-0.5">
                {eligibleCount > 0 ? (
                  <span>{eligibleCount} of {totalItems} items eligible for return</span>
                ) : (
                  <span className="text-yellow-700">No items eligible for return</span>
                )}
              </p>
            )}
          </div>
        </div>
        
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      
      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4 bg-white border-t border-gray-200">
              {/* Return policy details */}
              <div className="space-y-4">
                {/* Return window */}
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-gray-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900">Return Window</h4>
                    <p className="text-sm text-gray-700 mt-1">
                      Items must be returned within {returnWindowDays} days of delivery.
                      {isOrderSpecific && daysRemaining !== null && (
                        <span className={`ml-1 font-medium ${isWithinWindow ? 'text-green-600' : 'text-red-600'}`}>
                          {isWithinWindow ? (
                            `You have ${daysRemaining} days remaining.`
                          ) : (
                            `Return window expired ${Math.abs(daysRemaining)} days ago.`
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Item condition */}
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900">Item Condition</h4>
                    <p className="text-sm text-gray-700 mt-1">
                      Items must be unused, unworn, unwashed, and with all original tags attached.
                    </p>
                  </div>
                </div>
                
                {/* Non-returnable items */}
                <div className="flex items-start">
                  <XCircle className="w-5 h-5 text-gray-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900">Non-Returnable Items</h4>
                    <p className="text-sm text-gray-700 mt-1">
                      The following items cannot be returned: final sale items, personalized items, 
                      gift cards, sale items marked as non-returnable, and items marked as clearance.
                    </p>
                  </div>
                </div>
                
                {/* Exchange info if enabled */}
                {settings.allowExchanges && (
                  <div className="flex items-start">
                    <RefreshCw className="w-5 h-5 text-gray-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-gray-900">Exchanges</h4>
                      <p className="text-sm text-gray-700 mt-1">
                        Exchanges for different sizes or colors are available within the same return window.
                        Exchanges are subject to product availability.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Refund method */}
                <div className="flex items-start">
                  <DollarSign className="w-5 h-5 text-gray-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900">Refund Method</h4>
                    <p className="text-sm text-gray-700 mt-1">
                      Refunds will be issued to the original payment method. Please allow 5-10 business days 
                      for the refund to process after we receive your return.
                    </p>
                  </div>
                </div>
                
                {/* Order-specific ineligible items */}
                {isOrderSpecific && ineligibleItems && ineligibleItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Ineligible Items in This Order</h4>
                    <div className="space-y-2">
                      {ineligibleItems.map((item) => (
                        <div key={item.id} className="flex items-start bg-gray-50 p-2 rounded">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{item.name || item.title}</p>
                            <p className="text-xs text-red-600 mt-0.5">
                              {item.ineligibleReason || 'This item is not eligible for return'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Contact info */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  For questions about our return policy, please contact customer service at{' '}
                  <a 
                    href="mailto:support@example.com" 
                    className="text-blue-600 hover:underline"
                    style={{ color: theme?.primaryColor }}
                  >
                    support@example.com
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}