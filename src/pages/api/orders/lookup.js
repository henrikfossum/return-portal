// Enhanced src/pages/api/orders/lookup.js
import { getShopifyClientForTenant } from '@/lib/shopify/client';
import { getTenantSettings } from '@/lib/tenant/service';

/**
 * Rate limiting implementation to prevent abuse
 */
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  clients: new Map()
};

const isRateLimited = (clientId) => {
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
};

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are accepted',
    });
  }

  const { orderId, email } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  
  // Apply rate limiting using IP address or another identifier
  const clientId = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (isRateLimited(clientId)) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'You have made too many requests. Please try again later.',
    });
  }

  // Validate required fields
  if (!orderId || !email) {
    return res.status(400).json({
      error: 'Missing Required Fields',
      message: 'Please provide both an order ID and email address',
      fields: { orderId: !orderId, email: !email },
    });
  }

  try {
    // Get Shopify client and tenant settings
    const shopifyClients = await getShopifyClientForTenant(tenantId);
    const client = shopifyClients.rest;
    const gqlClient = shopifyClients.graphqlClient || null;
    
    const settings = await getTenantSettings(tenantId);
    const RETURN_WINDOW_DAYS = settings.returnWindowDays || 100;

    // Calculate cutoff date for returns
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETURN_WINDOW_DAYS);

    // Fetch the order by ID with error handling
    let orderResponse;
    try {
      orderResponse = await client.get({ path: `orders/${orderId}` });
    } catch (shopifyError) {
      console.error('Shopify API error:', shopifyError);
      
      // Handle different Shopify API errors
      if (shopifyError.response?.code === 404) {
        return res.status(404).json({
          error: 'Order Not Found',
          message: 'We could not find an order with the provided ID',
        });
      }
      
      return res.status(500).json({
        error: 'Service Unavailable',
        message: 'We are currently unable to process your request. Please try again later.',
      });
    }
    
    const { body } = orderResponse;

    // Verify order exists and email matches
    if (!body?.order) {
      return res.status(404).json({
        error: 'Order Not Found',
        message: 'We could not find an order with the provided ID',
      });
    }
    
    // Case-insensitive email comparison
    if (body.order.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({
        error: 'Email Mismatch',
        message: 'The email address does not match our records for this order',
      });
    }

    // Validate order status before proceeding
    const order = body.order;
    
    // Check if order is paid
    if (order.financial_status !== 'paid' && 
        order.financial_status !== 'partially_refunded' && 
        order.financial_status !== 'partially_paid') {
      return res.status(400).json({
        error: 'Order Not Eligible',
        message: 'This order is not eligible for returns as it has not been fully paid',
        details: { status: order.financial_status }
      });
    }
    
    // Check if order is cancelled
    if (order.cancelled_at || order.status === 'cancelled') {
      return res.status(400).json({
        error: 'Order Not Eligible',
        message: 'Cancelled orders are not eligible for returns',
      });
    }
    
    // Check for special "no returns" tags
    const orderTags = (order.tags || '').toLowerCase().split(',').map(t => t.trim());
    if (orderTags.includes('final-sale') || orderTags.includes('no-returns') || orderTags.includes('no-return')) {
      return res.status(400).json({
        error: 'Order Not Eligible',
        message: 'This order is marked as final sale and is not eligible for returns',
      });
    }

    // Process refunds to identify already returned items
    const refunds = order.refunds.flatMap(refund =>
      refund.refund_line_items.map(item => item.line_item_id)
    );

    // Create a map of product tags to use for eligibility checks
    const productTagsMap = {};
    
    // Filter eligible items with detailed validation
    const eligibleItems = [];
    const ineligibleItems = [];
    
    for (const item of order.line_items) {
      // Start with basic check
      const fulfillment = order.fulfillments?.find(f => 
        f.line_items.some(li => li.id === item.id)
      );
      
      // Track reason for ineligibility
      let ineligibleReason = null;
      
      if (!fulfillment) {
        ineligibleReason = 'Item not fulfilled';
      } else if (refunds.includes(item.id)) {
        ineligibleReason = 'Item already refunded';
      } else {
        const fulfillmentDate = new Date(fulfillment.created_at);
        if (fulfillmentDate < cutoffDate) {
          ineligibleReason = 'Outside return window';
        } else {
          // Check product properties for non-returnable items
          const itemProperties = item.properties || [];
          const isFinalSale = itemProperties.some(prop => 
            (prop.name === '_final_sale' && prop.value === 'true') ||
            (prop.name === 'final_sale' && prop.value === 'true')
          );
          
          // Check if it's a gift
          const isGift = itemProperties.some(prop => 
            (prop.name === '_gift' && prop.value === 'true') ||
            (prop.name === 'gift' && prop.value === 'true')
          );
          
          // New check for "Retur Pågår" (Return In Progress)
          const isReturnInProgress = itemProperties.some(prop => {
            // Normalize the property name and value
            const propName = prop.name.trim().toLowerCase();
            const propValue = (typeof prop.value === 'string')
              ? prop.value.trim().toLowerCase()
              : prop.value;
              
            return propName === 'retur pågår' && (propValue === true || propValue === 'true');
          });
          
          
          if (isFinalSale) {
            ineligibleReason = 'Final sale item';
          } else if (isGift) {
            ineligibleReason = 'Gift item';
          } else if (isReturnInProgress) {
            ineligibleReason = 'Return already in progress';
          }
        }
      }
      
      // Add items to eligible or ineligible arrays based on the check above
      if (ineligibleReason) {
        ineligibleItems.push({
          ...item,
          ineligibleReason
        });
      } else {
        eligibleItems.push(item);
      }
    }
    

    // If no eligible items, return a detailed error response
    if (eligibleItems.length === 0) {
      return res.status(400).json({
        error: 'No Eligible Items',
        message: 'No items in this order are eligible for return',
        details: {
          reasons: ineligibleItems.map(item => ({
            name: item.name || item.title,
            reason: item.ineligibleReason
          }))
        }
      });
    }

    // Fetch additional variant data including images
    // Same image fetching code as before
    const productVariantIds = eligibleItems
      .map(item => item.variant_id)
      .filter(id => id != null);

    let variantImages = {};
    
    // Only attempt to fetch images if we have variant IDs
    if (productVariantIds.length > 0) {
      console.log(`Attempting to fetch images for ${productVariantIds.length} variants`);
      
      // Try to fetch images with error handling
      try {
        // GraphQL query for images if available
        if (gqlClient && typeof gqlClient.request === 'function') {
          try {
            // GraphQL image fetching logic
            // ...
          } catch (graphqlError) {
            console.error('Error fetching variant images via GraphQL:', graphqlError);
          }
        }
        
        // Fallback to REST API for images
        if (Object.keys(variantImages).length === 0) {
          try {
            // REST API image fetching logic
            // ...
          } catch (restError) {
            console.error('Error in REST API fallback:', restError);
          }
        }
      } catch (imageError) {
        console.error('Error fetching product images:', imageError);
        // Continue without images - non-fatal error
      }
    }

    // Enrich eligible items with additional image fields and eligibility info
    const enrichedItems = eligibleItems.map(item => {
      const imageUrl = variantImages[item.variant_id] || null;
      return {
        ...item,
        imageUrl: imageUrl,
        variant_image: imageUrl,
        product_image: imageUrl,
        isEligibleForReturn: true,
        eligibilityStatus: 'eligible'
      };
    });

    // Add ineligible items with reason (but don't make them selectable)
    const ineligibleEnrichedItems = ineligibleItems.map(item => {
      const imageUrl = variantImages[item.variant_id] || null;
      return {
        ...item,
        imageUrl: imageUrl,
        variant_image: imageUrl,
        product_image: imageUrl,
        isEligibleForReturn: false,
        eligibilityStatus: 'ineligible',
        ineligibleReason: item.ineligibleReason
      };
    });

    // Return successful response with all relevant order details
    return res.status(200).json({
      id: order.id,
      order_number: order.order_number,
      email: order.email,
      created_at: order.created_at,
      processed_at: order.processed_at,
      customer: order.customer,
      shipping_address: order.shipping_address,
      line_items: [...enrichedItems, ...ineligibleEnrichedItems],
      eligible_items: enrichedItems,
      ineligible_items: ineligibleEnrichedItems,
      return_window_days: RETURN_WINDOW_DAYS,
      allow_exchanges: settings.allowExchanges,
      financial_status: order.financial_status,
      tags: order.tags,
      order_status_url: order.order_status_url
    });
  } catch (err) {
    console.error('Error fetching Shopify order:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while processing your request. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}