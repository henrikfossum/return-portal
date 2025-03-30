// src/lib/services/shopifySyncService.js
import { getShopifyClientForTenant } from '@/lib/shopify/client';
import ReturnRequest from '@/lib/db/models/ReturnRequest';
import connectToDatabase from '@/lib/db/connection';

/**
 * Synchronize returns from Shopify to MongoDB
 * @param {String} tenantId - Tenant identifier
 * @param {Number} daysBack - How many days back to sync
 * @returns {Promise<Object>} - Sync results
 */
export async function syncReturnsFromShopify(tenantId = 'default', daysBack = 90) {
  await connectToDatabase();
  
  // Get Shopify client
  const shopifyClients = await getShopifyClientForTenant(tenantId);
  const client = shopifyClients.rest;
  
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - daysBack);
  
  // Format dates for Shopify API
  const formattedStartDate = startDate.toISOString();
  const formattedEndDate = endDate.toISOString();
  
  // Track sync results
  const results = {
    success: true,
    synced: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };
  
  try {
    // Fetch orders with potential returns
    const { body } = await client.get({
      path: 'orders',
      query: {
        status: 'any',
        limit: 250,
        created_at_min: formattedStartDate,
        created_at_max: formattedEndDate,
        fields: 'id,order_number,email,created_at,processed_at,refunds,financial_status,tags,note,customer,line_items,shipping_address'
      }
    });
    
    const orders = body.orders || [];
    console.log(`Fetched ${orders.length} orders from Shopify`);
    
    // Filter to find returns
    const returnsFromShopify = orders.filter(order => 
      order.refunds?.length > 0 || 
      order.financial_status === 'refunded' || 
      order.financial_status === 'partially_refunded' ||
      (order.tags && (
        order.tags.includes('Return') || 
        order.tags.includes('return') ||
        order.tags.toLowerCase().includes('retur')
      )) ||
      (order.note && order.note.toLowerCase().includes('return'))
    );
    
    console.log(`Found ${returnsFromShopify.length} potential returns`);
    results.synced = returnsFromShopify.length;
    
    // Process each potential return
    for (const order of returnsFromShopify) {
      try {
        // Check if we already have this return in our database
        const existingReturn = await ReturnRequest.findOne({ 
          shopifyOrderId: order.id.toString(),
          tenantId
        });
        
        // Determine the return status
        const status = determineReturnStatus(order);
        
        // Extract return items
        const items = extractReturnItems(order);
        
        if (existingReturn) {
          // Update only if there are changes
          if (
            existingReturn.status !== status || 
            existingReturn.items.length !== items.length
          ) {
            existingReturn.status = status;
            existingReturn.items = items;
            existingReturn.updatedAt = new Date();
            
            // Add status history entry if status changed
            if (existingReturn.status !== status) {
              existingReturn.statusHistory.push({
                status,
                timestamp: new Date(),
                notes: 'Updated from Shopify sync',
                updatedBy: 'system'
              });
            }
            
            await existingReturn.save();
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          // Create a new return record
          const returnData = {
            orderId: order.order_number.toString(),
            orderNumber: order.order_number.toString(),
            shopifyOrderId: order.id.toString(),
            customer: {
              name: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest Customer',
              email: order.email || 'No email provided',
              phone: order.customer?.phone
            },
            createdAt: new Date(order.created_at),
            updatedAt: new Date(),
            status,
            items,
            statusHistory: [{
              status,
              timestamp: new Date(),
              notes: 'Created from Shopify sync',
              updatedBy: 'system'
            }],
            totalRefundAmount: calculateTotalRefund(order),
            tenantId
          };
          
          await ReturnRequest.create(returnData);
          results.created++;
        }
      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
        results.errors++;
      }
    }
    
    console.log(`Sync completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped, ${results.errors} errors`);
    return results;
    
  } catch (error) {
    console.error('Error syncing returns from Shopify:', error);
    results.success = false;
    throw error;
  }
}

/**
 * Calculate total refund amount from an order
 * @param {Object} order - Shopify order
 * @returns {Number} - Total refund amount
 */
function calculateTotalRefund(order) {
  if (!order.refunds || order.refunds.length === 0) {
    return 0;
  }
  
  return order.refunds.reduce((total, refund) => {
    // Get refund amount from transactions
    const transactionAmount = refund.transactions
      ? refund.transactions.reduce((sum, transaction) => 
          sum + parseFloat(transaction.amount || 0), 0)
      : 0;
      
    return total + transactionAmount;
  }, 0);
}

/**
 * Extract return items from an order
 * @param {Object} order - Shopify order
 * @returns {Array} - Return items
 */
function extractReturnItems(order) {
  // If no refunds, return empty array
  if (!order.refunds || order.refunds.length === 0) {
    return [];
  }
  
  // Build a map of line items for easy access
  const lineItemsMap = {};
  if (order.line_items) {
    order.line_items.forEach(item => {
      lineItemsMap[item.id] = item;
    });
  }
  
  // Extract return items from refunds
  const returnItems = [];
  order.refunds.forEach(refund => {
    if (refund.refund_line_items && refund.refund_line_items.length > 0) {
      refund.refund_line_items.forEach(refundItem => {
        const originalItem = lineItemsMap[refundItem.line_item_id];
        
        if (originalItem) {
          returnItems.push({
            id: refundItem.line_item_id.toString(),
            title: originalItem.title || originalItem.name || 'Unknown Item',
            variant_title: originalItem.variant_title || '',
            price: parseFloat(originalItem.price || 0),
            quantity: refundItem.quantity || 1,
            returnOption: 'return', // Default to return since we can't determine from Shopify
            returnReason: {
              reason: refundItem.reason || 'Unknown reason',
              additionalInfo: ''
            },
            refundAmount: parseFloat(refundItem.subtotal || 0)
          });
        }
      });
    }
  });
  
  return returnItems;
}

/**
 * Determine return status from order data
 * @param {Object} order - Shopify order
 * @returns {String} - Return status
 */
function determineReturnStatus(order) {
  const tagsArray = order.tags
    ? order.tags.split(',').map(tag => tag.trim().toLowerCase())
    : [];
    
  const financialStatus = order.financial_status?.toLowerCase() || '';

  // Define status mappings
  const statusMappings = {
    // Norwegian status terms
    'ferdig': 'completed',
    'sluttført': 'completed',
    'refundert': 'completed',
    'godkjent': 'approved',
    'avvist': 'rejected',
    'flagget': 'flagged',
    'pågår': 'pending',
    'delvis': 'approved', // "partially" typically means approved but not completed
    
    // English status terms
    'completed': 'completed',
    'approved': 'approved',
    'rejected': 'rejected',
    'flagged': 'flagged',
    'pending': 'pending'
  };
  
  // Start with default status
  let status = 'pending';
  
  // Check tags first
  for (const [keyword, mappedStatus] of Object.entries(statusMappings)) {
    if (tagsArray.some(tag => tag.includes(keyword))) {
      status = mappedStatus;
      break;
    }
  }
  
  // Financial status indicators
  if (financialStatus === 'refunded') {
    status = 'completed';
  } else if (financialStatus === 'partially_refunded') {
    if (status === 'pending') {
      status = 'approved';
    }
  }
  
  // Explicit return tags override other indicators
  if (tagsArray.includes('return-approved') || tagsArray.includes('retur-godkjent')) {
    status = 'approved';
  } else if (tagsArray.includes('return-flagged') || tagsArray.includes('retur-flagget')) {
    status = 'flagged';
  } else if (tagsArray.includes('return-rejected') || tagsArray.includes('retur-avvist')) {
    status = 'rejected';
  } else if (tagsArray.includes('return-completed') || tagsArray.includes('retur-fullført')) {
    status = 'completed';
  }
  
  return status;
}

/**
 * Run a full sync for all tenants
 * @returns {Promise<Object>} - Sync results for all tenants
 */
export async function syncAllTenants(daysBack = 30) {
  // In a production environment, you would fetch all tenants from your database
  // For now, we'll just sync the default tenant
  const tenants = ['default'];
  
  const results = {};
  
  for (const tenantId of tenants) {
    try {
      results[tenantId] = await syncReturnsFromShopify(tenantId, daysBack);
    } catch (error) {
      console.error(`Error syncing tenant ${tenantId}:`, error);
      results[tenantId] = { success: false, error: error.message };
    }
  }
  
  return results;
}