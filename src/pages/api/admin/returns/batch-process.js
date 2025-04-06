// src/pages/api/returns/batch-process.js
import { processReturn, processExchange } from '@/lib/shopify/returns';
import { getShopifyClientForTenant } from '@/lib/shopify/client';
import { analyzeReturnFraud, getSettings, flagFraudulentReturn } from '@/lib/fraud/detection';
import { createReturnRequest } from '@/lib/services/returnService';

// Helper function to validate items
function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, message: 'Missing or invalid items array' };
  }
  
  // Check if all required fields are present
  const invalidItems = items.filter(item => {
    if (!item.id || !item.orderId || !item.returnOption) {
      return true;
    }
    
    // If this is an exchange, validate exchange details
    if (item.returnOption === 'exchange') {
      return !item.exchangeDetails || !item.exchangeDetails.variantId;
    }
    
    return false;
  });
  
  if (invalidItems.length > 0) {
    return { 
      valid: false, 
      message: 'One or more items are missing required fields',
      invalidItems
    };
  }
  
  return { valid: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      message: 'Only POST requests are accepted' 
    });
  }

  const { items } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  
  // Validate items
  const validation = validateItems(items);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid Request',
      message: validation.message,
      details: validation.invalidItems
    });
  }

  try {
    // Get tenant settings for fraud prevention
    const settings = await getSettings(tenantId);
    
    // Get Shopify client for this tenant
    const shopifyClients = await getShopifyClientForTenant(tenantId);
    const client = shopifyClients.rest;
    
    // First, analyze the return for potential fraud
    const firstItem = items[0];
    const orderId = firstItem.orderId;
    
    // Fetch the full order to analyze
    let order;
    try {
      // Search for the order by order number (name) instead of ID
      const { body } = await client.get({
        path: 'orders',
        query: {
          status: 'any',
          name: orderId  // This is how you search by order number in Shopify
        }
      });
      
      // Check if we found any orders
      if (body?.orders && body.orders.length > 0) {
        // Use the first matching order
        order = body.orders[0];
      } else {
        console.error(`No order found with number ${orderId}`);
      }
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
    }
    
    // If we have the order and fraud prevention is enabled, check for fraud
    let fraudDetection = { isHighRisk: false, riskFactors: [] };
    
    if (order && settings.fraudPrevention.enabled) {
      // Add the return items to the order for analysis
      order.return_items = items.map(item => ({
        id: item.id,
        quantity: item.quantity || 1,
        returnOption: item.returnOption
      }));
      
      // Analyze for fraud
      fraudDetection = await analyzeReturnFraud(order, settings, client);
      
      // If high risk, flag the order
      if (fraudDetection.isHighRisk) {
        await flagFraudulentReturn(order, fraudDetection.riskFactors, client);
        
        // If auto-approve is disabled for high-risk returns, notify the admin
        if (!settings.autoApproveReturns) {
          // In a real app, this would send an email or notification
          console.log(`High-risk return detected for order ${orderId}. Manual review needed.`);
        }
      }
    }
    
    // Process the returns/exchanges (proceed even if high risk, but flagged for review)
    const results = [];
    const processedIds = new Set(); // Track processed items to prevent duplicates
    
    for (const item of items) {
      const { id: lineItemId, orderId, returnOption, exchangeDetails } = item;
      
      // Skip if we've already processed this item
      if (processedIds.has(lineItemId)) {
        console.log(`Skipping duplicate item: ${lineItemId}`);
        continue;
      }
      
      processedIds.add(lineItemId);
      
      try {
        if (returnOption === 'exchange' && exchangeDetails) {
          // Log for debugging
          console.log('Processing exchange:', {
            lineItemId,
            orderId,
            variantId: exchangeDetails.variantId,
            quantity: item.quantity || 1
          });
          
          // Process exchange 
          const exchangeResult = await processExchange(
            orderId,
            lineItemId,
            exchangeDetails.variantId,
            item.quantity || 1
          );

          try{
              // Build the return data object
              const returnData = {
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
              
              // Save to database
              await createReturnRequest(returnData);
            } catch (dbError) {
              console.error('Error saving return to database:', dbError);
              // Don't throw error here - we want to continue even if DB save fails
          }
          
          results.push({
            lineItemId,
            type: 'exchange',
            success: true,
            data: exchangeResult
          });
        } else {
          // Process return
          console.log('Processing return:', {
            lineItemId,
            orderId,
            quantity: item.quantity || 1
          });
          
          const returnResult = await processReturn(
            orderId,
            lineItemId,
            item.quantity || 1
          );

          try {
            // Build the return data object
            const returnData = {
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
            
            // Save to database
            await createReturnRequest(returnData);
          } catch (dbError) {
            console.error('Error saving return to database:', dbError);
            // Don't throw error here - we want to continue even if DB save fails
          }
          
          results.push({
            lineItemId,
            type: 'return',
            success: true,
            data: returnResult
          });
        }
      } catch (itemError) {
        console.error(`Error processing item ${lineItemId}:`, itemError);
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
    
    // Return response with fraud detection info
    if (hasFailures) {
      // Return 207 Multi-Status for partial success
      return res.status(207).json({
        status: 'partialSuccess',
        message: 'Some items could not be processed.',
        results,
        fraudDetection: {
          isHighRisk: fraudDetection.isHighRisk,
          riskFactors: fraudDetection.riskFactors,
          riskScore: fraudDetection.riskScore || 0
        }
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'All items processed successfully',
      results,
      fraudDetection: {
        isHighRisk: fraudDetection.isHighRisk,
        riskFactors: fraudDetection.riskFactors,
        riskScore: fraudDetection.riskScore || 0
      }
    });

  } catch (error) {
    console.error('Error processing batch:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}