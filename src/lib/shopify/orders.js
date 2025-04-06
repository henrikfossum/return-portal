// src/lib/shopify/orders.js
import { createApiError, ErrorTypes } from '@/lib/api/errorHandler';
import { getShopifyClientForTenant } from './client';
import { getTenantSettings } from '@/lib/tenant/service';
import logger from '@/lib/logging';

// Rate limiting implementation to prevent abuse
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 lookups per minute
  clients: new Map()
};

/**
 * Check if request is rate limited based on client IP
 * @param {string} clientId - Client identifier (IP address)
 * @returns {boolean} - Whether the request is rate limited
 */
function isRateLimited(clientId) {
  const now = Date.now();
  const clientData = RATE_LIMIT.clients.get(clientId) || { 
    count: 0, 
    resetAt: now + RATE_LIMIT.windowMs 
  };
  
  // Reset counter if window expired
  if (now > clientData.resetAt) {
    clientData.count = 1;
    clientData.resetAt = now + RATE_LIMIT.windowMs;
    RATE_LIMIT.clients.set(clientId, clientData);
    return false;
  }
  
  // Check if over limit
  if (clientData.count >= RATE_LIMIT.maxRequests) {
    logger.warn(
      `Rate limit exceeded for client ${clientId}`,
      { clientId, count: clientData.count, limit: RATE_LIMIT.maxRequests },
      'SECURITY'
    );
    return true;
  }
  
  // Increment counter
  clientData.count++;
  RATE_LIMIT.clients.set(clientId, clientData);
  return false;
}

/**
 * Look up an order by ID and email address, including detailed eligibility checks
 * @param {string} orderId - The Shopify order ID
 * @param {string} email - Customer's email address
 * @param {string} tenantId - Tenant identifier for multi-tenant support
 * @param {string} clientId - Client identifier for rate limiting
 * @returns {Promise<Object>} - The order with eligibility information
 */
export async function lookupOrder(orderId, email, tenantId = 'default', clientId = null) {
  // Start performance timer
  logger.startTimer(`lookupOrder-${orderId}`);
  
  try {
    // Input validation
    if (!orderId || !email) {
      throw createApiError(
        ErrorTypes.BAD_REQUEST,
        'Missing required parameters: orderId or email'
      );
    }
    
    // Apply rate limiting if clientId provided
    if (clientId && isRateLimited(clientId)) {
      throw createApiError(
        ErrorTypes.TOO_MANY_REQUESTS,
        'Rate limit exceeded. Please try again later.'
      );
    }

    // Get tenant settings
    const settings = await getTenantSettings(tenantId);
    const RETURN_WINDOW_DAYS = settings.returnWindowDays || 30;
    
    // Get Shopify client for this tenant
    const shopifyClients = await getShopifyClientForTenant(tenantId);
    const client = shopifyClients.rest;
    
    logger.info(`Looking up Shopify order ${orderId} for ${email}`, { tenantId }, 'ORDER');

    // Fetch the order by ID
    try {
      const { body: orderListResponse } = await client.get({
        path: 'orders',
        query: {
          status: 'any',
          name: orderId // Using the friendly order number
        }
      });
      
      // Then verify if we found the order
      if (!orderListResponse?.orders || orderListResponse.orders.length === 0) {
        throw createApiError(
          ErrorTypes.NOT_FOUND,
          'Order not found'
        );
      }
      
      // Use the first matching order
      const order = orderListResponse.orders[0];
      
      // Verify email match (case-insensitive)
      if (order.email.toLowerCase() !== email.toLowerCase()) {
        logger.warn(
          `Email mismatch for order ${orderId}`, 
          { provided: email, actual: order.email, tenantId }, 
          'SECURITY'
        );
        throw createApiError(
          ErrorTypes.FORBIDDEN,
          'The email address does not match our records for this order'
        );
      }
      
      // Check order status first (before doing expensive processing)
      
      // Check if order is paid
      const validPaymentStatuses = [
        'paid', 'partially_paid', 'partially_refunded'
      ];
      
      if (!validPaymentStatuses.includes(order.financial_status)) {
        logger.info(
          `Order ${orderId} has invalid payment status: ${order.financial_status}`,
          { status: order.financial_status, tenantId },
          'ORDER'
        );
        throw createApiError(
          ErrorTypes.ORDER_NOT_ELIGIBLE,
          `This order is not eligible for returns (status: ${order.financial_status})`,
          { financialStatus: order.financial_status }
        );
      }
      
      // Check if order is cancelled
      if (order.cancelled_at || order.status === 'cancelled') {
        logger.info(
          `Order ${orderId} is cancelled`,
          { tenantId },
          'ORDER'
        );
        throw createApiError(
          ErrorTypes.ORDER_NOT_ELIGIBLE,
          'Cancelled orders are not eligible for returns'
        );
      }
      
      // Check for "no return" tags on the order
      const orderTags = (order.tags || '').toLowerCase().split(',').map(tag => tag.trim());
      const noReturnTags = ['final-sale', 'no-returns', 'no-return', 'sample-sale'];
      
      if (noReturnTags.some(tag => orderTags.includes(tag))) {
        const matchedTag = noReturnTags.find(tag => orderTags.includes(tag));
        logger.info(
          `Order ${orderId} has no-return tag: ${matchedTag}`,
          { tags: order.tags, tenantId },
          'ORDER'
        );
        throw createApiError(
          ErrorTypes.ORDER_NOT_ELIGIBLE,
          'This order is not eligible for returns as it was marked as final sale',
          { tags: order.tags }
        );
      }

      // Calculate the cutoff date for returns
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - RETURN_WINDOW_DAYS);
      
      // Process refunds to identify already returned/refunded items
      const refundMap = {};
      
      if (order.refunds && order.refunds.length > 0) {
        for (const refund of order.refunds) {
          for (const refundItem of refund.refund_line_items || []) {
            const lineItemId = refundItem.line_item_id.toString();
            
            if (!refundMap[lineItemId]) {
              refundMap[lineItemId] = {
                quantity: 0,
                refundId: refund.id
              };
            }
            
            refundMap[lineItemId].quantity += refundItem.quantity || 0;
          }
        }
      }
      
      // Create fulfillment date map for quicker lookup
      const fulfillmentDateMap = {};
      
      if (order.fulfillments && order.fulfillments.length > 0) {
        for (const fulfillment of order.fulfillments) {
          const fulfillmentDate = new Date(fulfillment.created_at);
          
          for (const item of fulfillment.line_items || []) {
            const lineItemId = item.id.toString();
            
            // Only keep the most recent fulfillment date if multiple
            if (!fulfillmentDateMap[lineItemId] || 
                fulfillmentDateMap[lineItemId] < fulfillmentDate) {
              fulfillmentDateMap[lineItemId] = fulfillmentDate;
            }
          }
        }
      }

      // Process all line items with detailed eligibility info
      const allLineItems = order.line_items.map(item => {
        const itemId = item.id.toString();
        let isEligible = true;
        let ineligibleReason = null;
        
        // Check refund status
        const refundInfo = refundMap[itemId];
        const isFullyRefunded = refundInfo && refundInfo.quantity >= item.quantity;
        const isPartiallyRefunded = refundInfo && refundInfo.quantity > 0 && refundInfo.quantity < item.quantity;
        const remainingQuantity = isPartiallyRefunded ? 
          item.quantity - refundInfo.quantity : item.quantity;
        
        // Check fulfillment status
        const isFulfilled = item.fulfillment_status === 'fulfilled';
        const fulfillmentDate = fulfillmentDateMap[itemId];
        const isWithinWindow = fulfillmentDate && fulfillmentDate >= cutoffDate;
        
        // Check item properties for final sale, etc.
        const properties = item.properties || [];
        const isFinalSale = properties.some(prop => 
          (prop.name === '_final_sale' && prop.value === 'true') ||
          (prop.name === 'final_sale' && prop.value === 'true')
        );
        
        const isGift = properties.some(prop => 
          (prop.name === '_gift' && prop.value === 'true') ||
          (prop.name === 'gift' && prop.value === 'true')
        );
        
        const isPersonalized = properties.some(prop => 
          (prop.name === '_personalized' && prop.value === 'true') ||
          (prop.name === 'personalized' && prop.value === 'true')
        );
        
        // Determine eligibility with reason
        if (isFullyRefunded) {
          isEligible = false;
          ineligibleReason = 'Item already fully refunded';
        } else if (!isFulfilled) {
          isEligible = false;
          ineligibleReason = 'Item not yet fulfilled';
        } else if (!isWithinWindow) {
          isEligible = false;
          ineligibleReason = `Outside ${RETURN_WINDOW_DAYS}-day return window`;
        } else if (isFinalSale) {
          isEligible = false;
          ineligibleReason = 'Item marked as final sale';
        } else if (isPersonalized) {
          isEligible = false;
          ineligibleReason = 'Personalized items cannot be returned';
        } else if (isGift) {
          isEligible = false;
          ineligibleReason = 'Gift items cannot be returned';
        }
        
        // Return enhanced item with eligibility info
        return {
          ...item,
          isEligibleForReturn: isEligible,
          ineligibleReason: ineligibleReason,
          refundStatus: isFullyRefunded ? 'fully_refunded' : 
                        isPartiallyRefunded ? 'partially_refunded' : null,
          refundedQuantity: refundInfo ? refundInfo.quantity : 0,
          availableQuantity: remainingQuantity,
          fulfillmentDate: fulfillmentDate ? fulfillmentDate.toISOString() : null,
          isWithinReturnWindow: isWithinWindow,
          isFinalSale,
          isGift,
          isPersonalized
        };
      });
      
      // Separate eligible and ineligible items
      const eligibleItems = allLineItems.filter(item => item.isEligibleForReturn);
      const ineligibleItems = allLineItems.filter(item => !item.isEligibleForReturn);
      
      // Check if there are any eligible items
      if (eligibleItems.length === 0) {
        logger.info(
          `Order ${orderId} has no eligible items for return`,
          { 
            ineligibleReasons: ineligibleItems.map(item => ({
              id: item.id,
              reason: item.ineligibleReason
            })),
            tenantId 
          },
          'ORDER'
        );
        
        // Still return the order with eligibility info, don't throw error
        // This allows the frontend to display appropriate messaging
      }
      
      // Calculate return window details
      const orderDate = new Date(order.created_at);
      const now = new Date();
      const daysSinceOrder = Math.round((now - orderDate) / (1000 * 60 * 60 * 24));
      const isWithinReturnWindow = daysSinceOrder <= RETURN_WINDOW_DAYS;
      const daysRemainingInWindow = RETURN_WINDOW_DAYS - daysSinceOrder;
      
      // Log successful lookup
      logger.info(
        `Successfully looked up order ${orderId}`,
        { 
          eligibleItems: eligibleItems.length,
          ineligibleItems: ineligibleItems.length,
          isWithinReturnWindow,
          daysRemainingInWindow,
          tenantId
        },
        'ORDER'
      );
      
      // Add performance metrics
      const duration = logger.endTimer(`lookupOrder-${orderId}`, 'ORDER');
      
      // Return enhanced order object
      return {
        ...order,
        line_items: allLineItems,
        eligible_items: eligibleItems,
        ineligible_items: ineligibleItems,
        return_window_days: RETURN_WINDOW_DAYS,
        allow_exchanges: settings.allowExchanges !== false,
        isWithinReturnWindow,
        daysRemainingInWindow,
        daysSinceOrder,
        lookupDurationMs: duration
      };
    } catch (error) {
      // Handle Shopify API errors
      if (error.response) {
        const statusCode = error.response.status;
        const shopifyErrors = error.response.body?.errors || 
                              error.response.errors || 
                              'Unknown Shopify error';
        
        logger.error(
          `Shopify API error looking up order ${orderId}`,
          { statusCode, shopifyErrors, tenantId },
          'SHOPIFY'
        );
        
        if (statusCode === 404) {
          throw createApiError(
            ErrorTypes.NOT_FOUND,
            'Order not found'
          );
        } else if (statusCode === 401 || statusCode === 403) {
          throw createApiError(
            ErrorTypes.UNAUTHORIZED,
            'Not authorized to access this order'
          );
        } else {
          throw createApiError(
            ErrorTypes.SHOPIFY_API_ERROR,
            'Error communicating with Shopify API',
            { shopifyErrors }
          );
        }
      }
      
      // Re-throw API errors
      if (error.code && error.status) {
        throw error;
      }
      
      // Log and throw generic error for unexpected cases
      logger.error(
        `Unexpected error looking up order ${orderId}`,
        { error: error.message, stack: error.stack, tenantId },
        'ORDER'
      );
      
      throw createApiError(
        ErrorTypes.INTERNAL_SERVER_ERROR,
        'An unexpected error occurred while looking up your order'
      );
    }
  } catch (error) {
    // End performance timer even on error
    logger.endTimer(`lookupOrder-${orderId}`, 'ORDER');
    throw error;
  }
}

/**
 * Get order refund history
 * @param {string} orderId - The Shopify order ID
 * @param {string} tenantId - Tenant identifier for multi-tenant support
 * @returns {Promise<Object>} - The order refund history
 */
export async function getOrderRefundHistory(orderId, tenantId = 'default') {
  try {
    // Get Shopify client for this tenant
    const shopifyClients = await getShopifyClientForTenant(tenantId);
    const client = shopifyClients.rest;
    
    logger.info(`Getting refund history for order ${orderId}`, { tenantId }, 'ORDER');
    
    // Fetch the order
    const { body } = await client.get({
      path: `orders/${orderId}`,
    });
    
    if (!body?.order) {
      throw createApiError(
        ErrorTypes.NOT_FOUND,
        'Order not found'
      );
    }
    
    const order = body.order;
    const refunds = order.refunds || [];
    
    // Process refunds to get detailed history
    const refundHistory = refunds.map(refund => {
      // Extract line items being refunded
      const lineItems = refund.refund_line_items.map(item => {
        // Find the matching original line item
        const originalItem = order.line_items.find(li => li.id === item.line_item_id);
        
        return {
          id: item.line_item_id,
          quantity: item.quantity,
          subtotal: item.subtotal,
          title: originalItem?.title || 'Unknown Item',
          variant_title: originalItem?.variant_title || '',
          refund_id: refund.id
        };
      });
      
      // Extract transactions
      const transactions = refund.transactions.map(transaction => ({
        amount: transaction.amount,
        status: transaction.status,
        gateway: transaction.gateway,
        created_at: transaction.created_at
      }));
      
      return {
        id: refund.id,
        created_at: refund.created_at,
        note: refund.note,
        user_id: refund.user_id,
        processed_at: refund.processed_at,
        line_items: lineItems,
        transactions: transactions,
        total: refund.transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0).toFixed(2)
      };
    });
    
    // Calculate total refunded amount
    const totalRefunded = refundHistory.reduce(
      (sum, refund) => sum + parseFloat(refund.total), 
      0
    ).toFixed(2);
    
    // Determine if fully refunded
    const orderTotal = parseFloat(order.total_price).toFixed(2);
    const isFullyRefunded = parseFloat(totalRefunded) >= parseFloat(orderTotal);
    
    return {
      order_id: order.id,
      order_number: order.order_number,
      refunds: refundHistory,
      total_refunded: totalRefunded,
      order_total: orderTotal,
      is_fully_refunded: isFullyRefunded,
      refund_count: refunds.length
    };
  } catch (error) {
    // Re-throw API errors
    if (error.code && error.status) {
      throw error;
    }
    
    // Handle Shopify API errors
    if (error.response) {
      const statusCode = error.response.status;
      const shopifyErrors = error.response.body?.errors || 
                           error.response.errors || 
                           'Unknown Shopify error';
      
      logger.error(
        `Shopify API error getting refund history for order ${orderId}`,
        { statusCode, shopifyErrors, tenantId },
        'SHOPIFY'
      );
      
      throw createApiError(
        ErrorTypes.SHOPIFY_API_ERROR,
        'Error communicating with Shopify API',
        { shopifyErrors }
      );
    }
    
    // Log and throw generic error for unexpected cases
    logger.error(
      `Unexpected error getting refund history for order ${orderId}`,
      { error: error.message, stack: error.stack, tenantId },
      'ORDER'
    );
    
    throw createApiError(
      ErrorTypes.INTERNAL_SERVER_ERROR,
      'An unexpected error occurred while retrieving refund history'
    );
  }
}