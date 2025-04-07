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
    let order; // Declare before using it

    try {
      orderResponse = await client.get({
        path: 'orders',
        query: { status: 'any', name: orderId }
      });
      const { body } = orderResponse;
      
      if (body?.orders && body.orders.length > 0) {
        order = body.orders[0];
      } else if (body?.order) {
        order = body.order;
      }
    } catch (shopifyError) {
      console.error('Shopify API error:', shopifyError);
      // Handle the error appropriately
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
    order = body.order;
    
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
      console.log(`Fetching images for ${productVariantIds.length} variants`);
      
      try {
        // First attempt: Use GraphQL if available (more efficient)
        if (gqlClient) {
          try {
            const productsQuery = `
              query GetProductImages($ids: [ID!]!) {
                nodes(ids: $ids) {
                  ... on ProductVariant {
                    id
                    image {
                      url
                    }
                    product {
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            `;
            
            // Convert variant IDs to GraphQL global IDs
            const variantGlobalIds = productVariantIds.map(id => 
              `gid://shopify/ProductVariant/${id}`
            );
            
            const response = await gqlClient.query({
              data: {
                query: productsQuery,
                variables: { ids: variantGlobalIds }
              }
            });
            
            if (response.body?.data?.nodes) {
              const nodes = response.body.data.nodes;
              nodes.forEach(node => {
                if (node) {
                  // Extract variant ID from global ID
                  const idParts = node.id.split('/');
                  const variantId = idParts[idParts.length - 1];
                  
                  // Get image URL from variant or product
                  let imageUrl = null;
                  if (node.image?.url) {
                    imageUrl = node.image.url;
                  } else if (node.product?.images?.edges?.length > 0) {
                    imageUrl = node.product.images.edges[0].node.url;
                  }
                  
                  if (imageUrl && variantId) {
                    variantImages[variantId] = imageUrl;
                  }
                }
              });
              
              console.log(`Successfully fetched ${Object.keys(variantImages).length} images via GraphQL`);
            }
          } catch (graphqlError) {
            console.error('Error fetching variant images via GraphQL:', graphqlError);
          }
        }
        
        // Second attempt: Fallback to REST API if GraphQL didn't get all images
        if (Object.keys(variantImages).length < productVariantIds.length) {
          try {
            // For each variant without an image, fetch the product to get its images
            const variantsToFetch = productVariantIds.filter(id => !variantImages[id]);
            
            if (variantsToFetch.length > 0) {
              console.log(`Fetching ${variantsToFetch.length} missing images via REST API`);
              
              // Use Promise.all to fetch multiple variants in parallel
              await Promise.all(variantsToFetch.map(async (variantId) => {
                try {
                  // First get the variant details to find its product ID
                  const variantResponse = await client.get({
                    path: `variants/${variantId}`
                  });
                  
                  if (variantResponse.body?.variant?.product_id) {
                    const productId = variantResponse.body.variant.product_id;
                    
                    // Then fetch the product to get its images
                    const productResponse = await client.get({
                      path: `products/${productId}`
                    });
                    
                    if (productResponse.body?.product?.images?.length > 0) {
                      // Use the first product image as fallback
                      variantImages[variantId] = productResponse.body.product.images[0].src;
                    }
                  }
                } catch (error) {
                  console.error(`Error fetching details for variant ${variantId}:`, error);
                }
              }));
              
              console.log(`Successfully fetched ${Object.keys(variantImages).length} total images`);
            }
          } catch (restError) {
            console.error('Error in REST API fallback:', restError);
          }
        }
      } catch (imageError) {
        console.error('Error fetching product images:', imageError);
      }
    }

    // Enrich eligible items with additional image fields and eligibility info
    const enrichedItems = eligibleItems.map(item => {
      const imageUrl = variantImages[item.variant_id] || 
                      getDefaultProductImage(order) || 
                      '/placeholder-product.jpg';
      return {
        ...item,
        imageUrl: imageUrl,
        variant_image: imageUrl,
        product_image: imageUrl,
        isEligibleForReturn: true,
        eligibilityStatus: 'eligible'
      };
    });

    // Helper function to get a default image from any part of the order
    function getDefaultProductImage(order) {
      // Check if the order has a line items array
      if (order && order.line_items && order.line_items.length > 0) {
        // Look through all line items for an image
        for (const item of order.line_items) {
          if (item.image && item.image.src) {
            return item.image.src;
          }
        }
      }
      return null;
    }

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