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
      const orderId = id.startsWith('return-') ? id.replace('return-', '') : id;
      
      // Get Shopify client
      const shopifyClients = await getShopifyClientForTenant(tenantId);
      const client = shopifyClients.rest;
      
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

      let status = 'pending';

      // If fully refunded
      if (order.financial_status === 'refunded') {
        status = 'completed';
      }
      // Otherwise, see if the tags contain our "approved", "flagged", "rejected" markers
      else if (tagsArray.includes('return-approved') || tagsArray.includes('approved')) {
        status = 'approved';
      } else if (tagsArray.includes('return-flagged') || tagsArray.includes('flagged')) {
        status = 'flagged';
      } else if (tagsArray.includes('return-rejected') || tagsArray.includes('rejected')) {
        status = 'rejected';
      }
      // else keep 'pending' by default

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
      
      // Get the actual order ID from the return ID
      const orderId = id.startsWith('return-') ? id.replace('return-', '') : id;
      
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
            'return-pending','return-approved','return-completed','return-rejected','return-flagged'
          ].includes(tag)
        );
      
      // Add our new status tag
      tags.push(status);
      // Also push "Return" to mark it as a return
      if (!tags.includes('Return')) {
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
