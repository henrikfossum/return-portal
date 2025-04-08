// src/pages/api/returns/batch-process.js
import { processReturn, processExchange } from '@/lib/shopify/returns';
import { getShopifyClientForTenant } from '@/lib/shopify/client';
import { analyzeReturnFraud, getSettings, flagFraudulentReturn } from '@/lib/fraud/detection';
import { withErrorHandler, createApiError, ErrorTypes, validateRequiredFields } from '@/lib/api/errorHandler';
const DEBUG_MODE = true;

/**
 * Rate limiting implementation for batch processing
 */
const RATE_LIMIT = {
  windowMs: 60 * 60 * 1000, // 1 hour window
  maxRequests: 5, // 5 submissions per hour
  clients: new Map()
};

/**
 * Check if request is rate limited
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
    return true;
  }
  
  // Increment counter
  clientData.count++;
  RATE_LIMIT.clients.set(clientId, clientData);
  return false;
}

/**
 * Validate submission items
 */
function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw createApiError(
      ErrorTypes.BAD_REQUEST,
      'Missing or invalid items array'
    );
  }
  
  // Check for item limit to prevent abuse
  if (items.length > 20) {
    throw createApiError(
      ErrorTypes.BAD_REQUEST,
      'Too many items in submission (maximum 20)'
    );
  }
  
  // Validate each item
  items.forEach((item, index) => {
    try {
      validateRequiredFields(item, ['id', 'orderId', 'returnOption']);
      
      // Validate quantity
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        throw createApiError(
          ErrorTypes.BAD_REQUEST,
          `Invalid quantity for item at index ${index}`
        );
      }
      
      // If this is an exchange, validate exchange details
      if (item.returnOption === 'exchange') {
        if (!item.exchangeDetails || !item.exchangeDetails.variantId) {
          throw createApiError(
            ErrorTypes.BAD_REQUEST,
            `Missing exchange details for item at index ${index}`
          );
        }
      }
    } catch (error) {
      // Add item index to the error
      error.details = { ...(error.details || {}), itemIndex: index };
      throw error;
    }
  });
  
  return true;
}

/**
 * Get common order ID to prevent cross-order manipulation
 */
function getCommonOrderId(items) {
  if (!items || items.length === 0) return null;
  
  const firstOrderId = items[0].orderId.toString();
  
  // Check if all items have the same order ID
  const allSameOrder = items.every(item => 
    item.orderId.toString() === firstOrderId
  );
  
  if (!allSameOrder) {
    throw createApiError(
      ErrorTypes.BAD_REQUEST,
      'All items must belong to the same order'
    );
  }
  
  return firstOrderId;
}

/**
 * Fetch and validate original order
 */
async function getAndValidateOrder(orderId, shopifyClient) {
  try {
    // Fetch the order
    const { body } = await shopifyClient.rest.get({
      path: `orders/${orderId}`
    });
    
    if (!body?.order) {
      throw createApiError(
        ErrorTypes.NOT_FOUND,
        'Order not found',
        { orderId }
      );
    }
    
    return body.order;
  } catch (error) {
    // Re-throw API errors
    if (error.code && error.status) {
      throw error;
    }
    
    // Handle Shopify API errors
    if (error.response && error.response.errors) {
      throw createApiError(
        ErrorTypes.SHOPIFY_API_ERROR,
        'Error fetching order from Shopify',
        { shopifyErrors: error.response.errors }
      );
    }
    
    // Generic error
    throw createApiError(
      ErrorTypes.INTERNAL_SERVER_ERROR,
      'Error fetching order: ' + error.message
    );
  }
}

/**
 * Log return activity for auditing
 */
async function logReturnActivity(orderId, items, clientInfo, fraudResult) {
  try {
    // In a production environment, this would write to a database
    console.log('Return activity:', {
      timestamp: new Date().toISOString(),
      orderId,
      items: items.length,
      clientIp: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      fraudRisk: fraudResult.isHighRisk ? 'HIGH' : 'LOW',
      riskScore: fraudResult.riskScore
    });
    
    return true;
  } catch (error) {
    console.error('Error logging return activity:', error);
    return false; // Non-critical failure
  }
}

/**
 * Handler function for batch processing returns
 */
async function batchProcessHandler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    throw createApiError(
      ErrorTypes.METHOD_NOT_ALLOWED,
      'Only POST requests are accepted'
    );
  }

  const { items } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  
  // Get client identification for rate limiting
  const clientId = req.headers['x-forwarded-for'] || 
                  req.connection.remoteAddress || 
                  'unknown';
                  
  const clientInfo = {
    ip: clientId,
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  // Check rate limiting
  if (isRateLimited(clientId)) {
    throw createApiError(
      ErrorTypes.TOO_MANY_REQUESTS,
      'Rate limit exceeded. Please try again later.'
    );
  }

  // Validate items format and requirements
  validateItems(items);
  
  // Ensure all items are from the same order (prevent cross-order manipulation)
  const orderId = getCommonOrderId(items);
  if (!orderId) {
    throw createApiError(
      ErrorTypes.BAD_REQUEST,
      'Invalid or missing order ID'
    );
  }

  try {
    // Get tenant settings for fraud prevention
    const settings = await getSettings(tenantId);
    
    // Get Shopify client for this tenant
    const shopifyClients = await getShopifyClientForTenant(tenantId);
    const client = shopifyClients.rest;
    
    // Fetch and validate the original order
    const order = await getAndValidateOrder(orderId, shopifyClients);
    
    // Add the return items to the order for analysis
    order.return_items = items.map(item => ({
      id: item.id,
      quantity: item.quantity || 1,
      returnOption: item.returnOption
    }));
    
    // Analyze for fraud
    const fraudDetection = await analyzeReturnFraud(order, settings, client);
    
    // Log return activity (for audit trail)
    logReturnActivity(orderId, items, clientInfo, fraudDetection);
    
    // If high risk, flag the order
    if (fraudDetection.isHighRisk) {
      await flagFraudulentReturn(order, fraudDetection.riskFactors, client);
      
      // If auto-approve is disabled for high-risk returns, return an error
      if (!settings.autoApproveReturns && fraudDetection.riskScore >= settings.fraudPrevention.highRiskThreshold) {
        throw createApiError(
          ErrorTypes.FRAUD_DETECTED,
          'This return requires manual review. Please contact customer support.',
          {
            orderId,
            riskScore: fraudDetection.riskScore,
            riskFactors: fraudDetection.riskFactors
          }
        );
      }
    }
    
    const results = [];
    const processedIds = new Set(); // Track processed items to prevent duplicates
    
    console.log('🔄 Starting item processing', { totalItems: items.length });
    
    for (const item of items) {
      const { id: lineItemId, orderId, returnOption, exchangeDetails } = item;
      
      // Skip if we've already processed this item
      if (processedIds.has(lineItemId)) {
        console.log(`⏩ Skipping duplicate item: ${lineItemId}`);
        continue;
      }
      
      processedIds.add(lineItemId);
      
      try {
        let processResult;
        let returnData;
  
        if (returnOption === 'exchange' && exchangeDetails) {
          console.log('🔄 Processing exchange', {
            lineItemId,
            orderId,
            variantId: exchangeDetails.variantId,
            quantity: item.quantity || 1
          });
          
          // Process exchange 
          processResult = await processExchange(
            orderId,
            lineItemId,
            exchangeDetails.variantId,
            item.quantity || 1
          );
        } else {
          console.log('🔙 Processing return', {
            lineItemId,
            orderId,
            quantity: item.quantity || 1
          });
          
          // Process return
          processResult = await processReturn(
            orderId,
            lineItemId,
            item.quantity || 1
          );
        }
  
        // Build the return data object
        returnData = {
          orderId: orderId,
          orderNumber: order.order_number,
          shopifyOrderId: order.id,
          customer: {
            name: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest Customer',
            email: order.email,
            phone: order.customer?.phone
          },
          status: 'pending', // Initial status
          items: items.map(item => {
            // Find the original item in the order
            const orderItem = order.line_items.find(li => li.id.toString() === item.id.toString());
            return {
              id: item.id,
              title: orderItem?.title || 'Unknown Item',
              variant_title: orderItem?.variant_title || '',
              price: parseFloat(orderItem?.price || 0),
              quantity: item.quantity || 1,
              returnOption: item.returnOption,
              returnReason: item.returnReason || { reason: 'Not specified' },
              exchangeDetails: item.returnOption === 'exchange' ? item.exchangeDetails : null
            };
          }),
          createdAt: new Date(),
          tenantId: tenantId
        };
  
        // Save to database with enhanced logging
        console.log('💾 ATTEMPTING DATABASE SAVE:', {
          orderId: returnData.orderId,
          email: returnData.customer?.email,
          items: returnData.items?.length,
          tenantId: returnData.tenantId,
          mongodbUriExists: !!process.env.MONGODB_URI
        });
        
        try {
          const savedReturn = await createReturnRequest(returnData);
          
          console.log('✅ DATABASE SAVE SUCCESSFUL:', {
            savedReturnId: savedReturn._id,
            savedOrderNumber: savedReturn.orderNumber
          });
          
          results.push({
            lineItemId,
            type: returnOption,
            success: true,
            data: processResult,
            dbSuccess: true
          });
        } catch (dbError) {
          console.error('❌ DATABASE SAVE FAILED:', {
            error: dbError.message,
            name: dbError.name,
            code: dbError.code,
            stack: DEBUG_MODE ? dbError.stack : undefined
          });
          
          // Continue with the process - add success for the item but mark database as failed
          results.push({
            lineItemId,
            type: returnOption,
            success: true, // Still mark the item as processed successfully
            data: processResult,
            dbSuccess: false,
            dbError: dbError.message
          });
          
          if (DEBUG_MODE) {
            // In debug mode, return detailed error
            return res.status(207).json({
              status: 'partialSuccess',
              message: 'Return processed but database save failed',
              error: dbError.message,
              errorName: dbError.name,
              stack: dbError.stack,
              results
            });
          }
        }
      } catch (itemError) {
        console.error(`❌ Error processing item ${lineItemId}:`, {
          message: itemError.message,
          name: itemError.name,
          stack: DEBUG_MODE ? itemError.stack : undefined
        });
        
        results.push({
          lineItemId,
          type: returnOption,
          success: false,
          error: itemError.message
        });
      }
    }
  
    // Check if any operations failed
    const hasFailures = results.some(result => !result.success);
    const hasDbFailures = results.some(result => result.success && !result.dbSuccess);
    
    console.log('🏁 Batch processing complete', {
      totalItems: items.length,
      processedItems: results.length,
      successfulItems: results.filter(r => r.success).length,
      failedItems: results.filter(r => !r.success).length,
      dbSuccessItems: results.filter(r => r.dbSuccess).length,
      dbFailedItems: results.filter(r => r.success && !r.dbSuccess).length
    });
  
    // Return response with fraud detection info
    if (hasFailures) {
      console.warn('⚠️ Some items could not be processed');
      
      return res.status(207).json({
        status: 'partialSuccess',
        message: 'Some items could not be processed.',
        results,
        dbSuccess: !hasDbFailures,
        fraudDetection: {
          isHighRisk: fraudDetection.isHighRisk,
          riskFactors: fraudDetection.riskFactors,
          riskScore: fraudDetection.riskScore || 0
        }
      });
    }
  
    return res.status(200).json({
      status: 'success',
      message: 'All items processed successfully' + (hasDbFailures ? ' but database save failed' : ''),
      results,
      dbSuccess: !hasDbFailures,
      fraudDetection: {
        isHighRisk: fraudDetection.isHighRisk,
        riskFactors: fraudDetection.riskFactors,
        riskScore: fraudDetection.riskScore || 0
      }
    });
  
  } catch (error) {
    console.error('❌ Critical error in batch processing:', {
      message: error.message,
      name: error.name,
      stack: DEBUG_MODE ? error.stack : undefined
    });
    
    return res.status(500).json({
      error: 'Server Error',
      message: error.message,
      stack: DEBUG_MODE ? error.stack : undefined,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Export the handler wrapped with error handling middleware
export default withErrorHandler(batchProcessHandler);