// src/pages/api/admin/returns/[id].js
import { getShopifyClientForTenant } from '@/lib/shopify/client';

export default async function handler(req, res) {
  // Check for admin authorization
  const adminToken = req.headers.authorization?.split(' ')[1];
  if (!adminToken || adminToken !== 'demo-admin-token') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin authentication required'
    });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({
      error: 'Missing Required Parameter',
      message: 'Return ID is required'
    });
  }

  const tenantId = req.headers['x-tenant-id'] || 'default';

  // GET method - fetch return details
  if (req.method === 'GET') {
    try {
      // Get the actual order ID from the return ID
      // Ensure we have a clean numeric ID for Shopify API
      let orderId = id;
      if (id.startsWith('return-')) {
        orderId = id.replace('return-', '');
      }
      
      // Ensure the ID is numeric and doesn't contain any non-numeric characters
      if (orderId.includes('-') || orderId.includes('/') || isNaN(Number(orderId))) {
        console.log('Invalid order ID format:', orderId);
        return res.status(400).json({
          error: 'Invalid ID Format',
          message: 'The provided ID format is not valid for Shopify API'
        });
      }

      // Get Shopify client
      const shopifyClients = await getShopifyClientForTenant(tenantId);
      const client = shopifyClients.rest;
      
      console.log('Fetching order with ID:', orderId);
      
      // Fetch the order
      const { body } = await client.get({
        path: `orders/${orderId}`
      });
      
      if (!body?.order) {
        return res.status(404).json({
          error: 'Return Not Found',
          message: 'Could not find a return with the provided ID'
        });
      }
      
      const order = body.order;

      // ---
      // DETERMINE RETURN STATUS
      // ---

      // Convert tags string into an array for easier matching
      const tagsArray = order.tags
        ? order.tags.split(',').map(tag => tag.trim().toLowerCase())
        : [];
      
      const orderNote = order.note?.toLowerCase() || '';
      const financialStatus = order.financial_status?.toLowerCase() || '';

      // Start with default status
      let status = 'pending';
      
      // Check for status indicators in a more systematic way
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
      
      // Check tags first, as they generally override other status indicators
      for (const [keyword, mappedStatus] of Object.entries(statusMappings)) {
        if (tagsArray.some(tag => tag.includes(keyword))) {
          status = mappedStatus;
          break;
        }
      }
      
      // Financial status can also indicate return status
      if (financialStatus === 'refunded') {
        status = 'completed';
      } else if (financialStatus === 'partially_refunded') {
        // If partially refunded and not explicitly marked otherwise, consider it approved
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

      // ---
      // BUILD RETURN ITEMS
      // ---
      // We will show ALL line items, but also note if they've been partially or fully refunded.
      const returnItems = [];

      // Make an easy map of refund details: how many were refunded and any reason/note
      let refundMap = {}; 
      if (order.refunds && order.refunds.length > 0) {
        for (const refund of order.refunds) {
          for (const refundItem of refund.refund_line_items) {
            const lineItemId = refundItem.line_item_id;
            // If we haven't seen this line item yet, initialize
            if (!refundMap[lineItemId]) {
              refundMap[lineItemId] = {
                refunded_quantity: 0,
                reason: []
              };
            }
            // Accumulate quantity
            refundMap[lineItemId].refunded_quantity += refundItem.quantity;

            // Capture reason (or note). If multiple refunds, push them
            const itemReason = refundItem.reason || refundItem.note;
            if (itemReason) {
              refundMap[lineItemId].reason.push(itemReason);
            }
          }
        }
      }

      // Now loop all line_items to build the final items array
      for (const item of order.line_items) {
        // Check if there's a refunded record for this item
        const refundInfo = refundMap[item.id] || { refunded_quantity: 0, reason: [] };

        returnItems.push({
          id: item.id,
          title: item.name || item.title,
          variant_title: item.variant_title,
          quantity: item.quantity, // total purchased
          refunded_quantity: refundInfo.refunded_quantity, // how many have been refunded
          price: item.price,
          return_type: 'return', // you can adapt if you track exchanges differently
          reason: refundInfo.reason.join('; ') || 'No reason provided',
          imageUrl: item.image?.src,
          product_id: item.product_id
        });
      }

      // ---
      // BUILD HISTORY
      // ---
      const history = [
        {
          type: 'created',
          title: 'Return requested',
          timestamp: order.created_at,
          user: order.customer
            ? `${order.customer.first_name} ${order.customer.last_name}`
            : 'Customer'
        }
      ];

      // If we have refunds, add them to history
      if (order.refunds && order.refunds.length > 0) {
        order.refunds.forEach(refund => {
          history.push({
            type: 'completed',
            title: 'Refund processed',
            timestamp: refund.processed_at || refund.created_at,
            notes: refund.note,
            user: 'Shopify'
          });
        });
      }
      
      // ---
      // CALCULATE TOTAL REFUND
      // ---
      const totalRefund = order.refunds
        ? order.refunds.reduce(
            (total, refund) =>
              total + parseFloat(refund.transactions?.[0]?.amount || 0),
            0
          )
        : 0;
        
      // ---
      // CHECK IF FULLY REFUNDED
      // ---
      const isFullyRefunded = financialStatus === 'refunded' || 
        (order.refunds && 
         order.line_items && 
         order.line_items.every(item => 
           order.refunds.some(refund => 
             refund.refund_line_items.some(ri => ri.line_item_id === item.id && ri.quantity === item.quantity)
           )
         ));

      // ---
      // ASSEMBLE THE RETURN DETAILS OBJECT
      // ---
      const returnData = {
        id: id,
        order_id: `#${order.order_number}`,
        order_number: order.order_number,
        customer: {
          name: order.customer
            ? `${order.customer.first_name} ${order.customer.last_name}`
            : 'Guest Customer',
          email: order.email || 'No email provided',
          phone: order.customer?.phone
        },
        created_at: order.created_at,
        order_date: order.processed_at || order.created_at,
        status: status,
        items: returnItems,
        shipping_address: order.shipping_address,
        has_returns: !!(order.refunds && order.refunds.length),
        has_exchanges: order.note?.toLowerCase().includes('exchange') || false,
        total_refund: totalRefund || parseFloat(order.total_price),
        history: history,
        admin_notes: order.note || '',
        is_fully_refunded: isFullyRefunded,
        original_order: order
      };
      
      return res.status(200).json(returnData);
      
    } catch (err) {
      console.error('Error fetching return details:', err);
      return res.status(500).json({
        error: 'Server Error',
        message: 'An error occurred while processing your request',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
  
  // PATCH method - update return status
  else if (req.method === 'PATCH') {
    try {
      const { status, adminNotes } = req.body;
      
      if (!status) {
        return res.status(400).json({
          error: 'Missing Required Field',
          message: 'Status is required'
        });
      }
      
      // Get the actual order ID from the return ID and ensure it's a valid format
      let orderId = id;
      if (id.startsWith('return-')) {
        orderId = id.replace('return-', '');
      }
      
      // Ensure the ID is numeric
      if (orderId.includes('-') || orderId.includes('/') || isNaN(Number(orderId))) {
        console.log('Invalid order ID format for update:', orderId);
        return res.status(400).json({
          error: 'Invalid ID Format',
          message: 'The provided ID format is not valid for Shopify API'
        });
      }
      
      // Get Shopify client
      const shopifyClients = await getShopifyClientForTenant(tenantId);
      const client = shopifyClients.rest;
      
      // Fetch the order to get existing tags
      const { body: orderData } = await client.get({
        path: `orders/${orderId}`
      });
      
      if (!orderData?.order) {
        return res.status(404).json({
          error: 'Order Not Found',
          message: 'Could not find the order to update'
        });
      }
      
      // Prepare tags - remove any existing status tags
      let tags = (orderData.order.tags || '').split(',')
        .map(tag => tag.trim())
        .filter(tag => 
          ![
            'pending','approved','completed','rejected','flagged',
            'return-pending','return-approved','return-completed','return-rejected','return-flagged',
            // Norwegian variants
            'retur-pågår','retur-godkjent','retur-fullført','retur-avvist','retur-flagget'
          ].includes(tag.toLowerCase())
        );
      
      // Add our new status tag
      tags.push(`return-${status}`);
      // Also push "Return" to mark it as a return
      if (!tags.includes('Return') && !tags.includes('return') && !tags.includes('Retur') && !tags.includes('retur')) {
        tags.push('Return');
      }
      
      // Combine all notes
      const combinedNotes = adminNotes 
        ? (orderData.order.note ? `${orderData.order.note}\n\n` : '') + 
          `[${new Date().toISOString()}] Status changed to ${status}: ${adminNotes}`
        : orderData.order.note;
      
      // Update the order with new status via tags and notes
      const { body } = await client.put({
        path: `orders/${orderId}`,
        data: {
          order: {
            id: orderId,
            tags: tags.join(', '),
            note: combinedNotes
          }
        }
      });
      
      if (!body?.order) {
        return res.status(500).json({
          error: 'Update Failed',
          message: 'Failed to update return status'
        });
      }
      
      // If status is "completed", create a refund if not already refunded
      if (status === 'completed' && body.order.financial_status !== 'refunded') {
        try {
          // Try to find refundable line items
          const refundableItems = body.order.line_items
            .filter(item => item.fulfillment_status === 'fulfilled' && !item.refunded)
            .map(item => ({
              line_item_id: item.id,
              quantity: item.quantity,
              restock_type: "return"
            }));
            
          // Only proceed if there are items to refund
          if (refundableItems.length > 0) {
            await client.post({
              path: `orders/${orderId}/refunds`,
              data: {
                refund: {
                  notify: true,
                  note: adminNotes || 'Return processed via admin panel',
                  refund_line_items: refundableItems,
                  shipping: { full_refund: true }
                }
              }
            });
          }
        } catch (refundErr) {
          console.error('Error creating refund:', refundErr);
          // Continue even if refund creation fails, it might already be refunded
        }
      }
      
      // Return success
      return res.status(200).json({
        success: true,
        message: `Return status updated to ${status}`,
        order: body.order
      });
      
    } catch (err) {
      console.error('Error updating return status:', err);
      return res.status(500).json({
        error: 'Server Error',
        message: 'An error occurred while processing your request',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
  
  // Handle other methods
  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).json({ 
    error: 'Method Not Allowed',
    message: `Method ${req.method} is not allowed` 
  });
}