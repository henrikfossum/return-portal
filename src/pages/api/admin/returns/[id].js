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
      
      // Determine return status
      let status = 'pending';
      if (order.financial_status === 'refunded') {
        status = 'completed';
      } else if (order.tags?.includes('approved') || order.tags?.includes('return-approved')) {
        status = 'approved';
      } else if (order.tags?.includes('flagged') || order.tags?.includes('return-flagged')) {
        status = 'flagged';
      } else if (order.tags?.includes('rejected') || order.tags?.includes('return-rejected')) {
        status = 'rejected';
      }
      
      // Build return items
      const returnItems = [];
      
      // If there are refunds, use those items
      if (order.refunds && order.refunds.length > 0) {
        order.refunds.forEach(refund => {
          refund.refund_line_items.forEach(refundItem => {
            const originalItem = order.line_items.find(
              item => item.id === refundItem.line_item_id
            );
            
            if (originalItem) {
              returnItems.push({
                id: originalItem.id,
                title: originalItem.name || originalItem.title,
                variant_title: originalItem.variant_title,
                quantity: refundItem.quantity,
                price: originalItem.price,
                return_type: 'return', // Default to return
                reason: refundItem.reason || refundItem.note || 'No reason provided',
                imageUrl: originalItem.image?.src,
                product_id: originalItem.product_id
              });
            }
          });
        });
      } 
      // If no refunds or items not found, use the original line items
      else if (returnItems.length === 0) {
        order.line_items.forEach(item => {
          returnItems.push({
            id: item.id,
            title: item.name || item.title,
            variant_title: item.variant_title,
            quantity: item.quantity,
            price: item.price,
            return_type: 'return', // Default to return
            reason: 'Unknown reason',
            imageUrl: item.image?.src,
            product_id: item.product_id
          });
        });
      }
      
      // Create history entries based on events in the order
      const history = [
        {
          type: 'created',
          title: 'Return requested',
          timestamp: order.created_at,
          user: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Customer'
        }
      ];
      
      // Add refund events to history
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
      
      // Calculate total refund
      const totalRefund = order.refunds ?
        order.refunds.reduce((total, refund) => 
          total + parseFloat(refund.transactions?.[0]?.amount || 0), 0) : 0;
      
      // Assemble the return details object
      const returnData = {
        id: id,
        order_id: `#${order.order_number}`,
        order_number: order.order_number,
        customer: {
          name: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest Customer',
          email: order.email || 'No email provided',
          phone: order.customer?.phone
        },
        created_at: order.created_at,
        order_date: order.processed_at || order.created_at,
        status: status,
        items: returnItems,
        shipping_address: order.shipping_address,
        has_returns: !!order.refunds?.length,
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
      
      // First fetch the order to get existing tags
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
          !['pending', 'approved', 'completed', 'rejected', 'flagged', 
            'return-pending', 'return-approved', 'return-completed', 'return-rejected', 'return-flagged']
            .includes(tag)
        );
      
      // Add our new status tag
      tags.push(status);
      tags.push('Return'); // Always mark as a return
      
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
          // Continue even if refund creation fails, this may be because it's already refunded
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