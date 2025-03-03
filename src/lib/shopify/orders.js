// src/lib/shopify/orders.js
import { client } from './client';

// Constants
export const RETURN_WINDOW_DAYS = 100; // Make this configurable per tenant in the future

export async function lookupOrder(orderId, email) {
  if (!orderId || !email) {
    throw new Error('Missing required parameters: orderId or email');
  }

  try {
    // Fetch the order by ID
    const { body } = await client.get({
      path: `orders/${orderId}`,
    });

    if (!body?.order || body.order.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error('Order not found or email mismatch');
    }

    // Process refunds to identify already returned items
    const refunds = body.order.refunds.flatMap((refund) =>
      refund.refund_line_items.map((item) => item.line_item_id)
    );

    // Calculate the cutoff date for returns
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETURN_WINDOW_DAYS);

    // Filter eligible items
    const eligibleItems = body.order.line_items.filter((item) => {
      // Check if item is fulfilled and not refunded
      const isEligible = item.fulfillment_status === 'fulfilled' && 
                        !refunds.includes(item.id);
      
      if (!isEligible) return false;

      // Find fulfillment date
      const fulfillment = body.order.fulfillments?.find(f => 
        f.line_items.some(li => li.id === item.id)
      );
      
      if (!fulfillment) return false;

      // Check if within return window
      const fulfillmentDate = new Date(fulfillment.created_at);
      return fulfillmentDate >= cutoffDate;
    });

    return {
      ...body.order,
      line_items: eligibleItems,
    };
  } catch (err) {
    console.error('Error fetching Shopify order:', err);
    throw new Error(err.message || 'Error fetching order');
  }
}

