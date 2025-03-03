// src/pages/api/orders/lookup.js
import { getShopifyClientForTenant } from '@/lib/shopify/client';
import { getTenantSettings } from '@/lib/tenant/service';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are accepted',
    });
  }

  const { orderId, email } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 'default';

  if (!orderId || !email) {
    return res.status(400).json({
      error: 'Missing Required Fields',
      message: 'Please provide both an order ID and email address',
      fields: { orderId: !orderId, email: !email },
    });
  }

  try {
    // Get Shopify client for tenant (both REST and GraphQL)
    const shopifyClients = await getShopifyClientForTenant(tenantId);
    const client = shopifyClients.rest; // Get the REST client

    // Safely access the GraphQL client
    const gqlClient = shopifyClients.graphqlClient || null;
    
    const settings = await getTenantSettings(tenantId);
    const RETURN_WINDOW_DAYS = settings.returnWindowDays || 100;

    // Fetch the order by ID
    const { body } = await client.get({ path: `orders/${orderId}` });

    if (!body?.order || body.order.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(404).json({
        error: 'Order Not Found',
        message: 'We could not find an order matching the provided details',
      });
    }

    // Process refunds to identify already returned items
    const refunds = body.order.refunds.flatMap(refund =>
      refund.refund_line_items.map(item => item.line_item_id)
    );

    // Calculate the cutoff date for returns
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETURN_WINDOW_DAYS);

    // Filter eligible items 
    const eligibleItems = body.order.line_items.filter(item => {
      const isEligible = item.fulfillment_status === 'fulfilled' && !refunds.includes(item.id);
      if (!isEligible) return false;

      const fulfillment = body.order.fulfillments?.find(f =>
        f.line_items.some(li => li.id === item.id)
      );
      if (!fulfillment) return false;

      const fulfillmentDate = new Date(fulfillment.created_at);
      return fulfillmentDate >= cutoffDate;
    });

    if (eligibleItems.length === 0) {
      return res.status(400).json({
        error: 'No Eligible Items',
        message: 'No items in this order are eligible for return',
      });
    }

    // Extract variant IDs from eligible items, guarding against missing values
    const productVariantIds = eligibleItems
      .map(item => item.variant_id)
      .filter(id => id != null);

    let variantImages = {};
    
    // Only attempt to fetch images if we have variant IDs
    if (productVariantIds.length > 0) {
      console.log(`Attempting to fetch images for ${productVariantIds.length} variants`);
      
      // Try GraphQL first if client is available
      if (gqlClient && typeof gqlClient.request === 'function') {
        try {
          const imageQuery = `
            query getVariantImages($variantIds: [ID!]!) {
              nodes(ids: $variantIds) {
                ... on ProductVariant {
                  id
                  image {
                    originalSrc
                  }
                  product {
                    featuredImage {
                      originalSrc
                    }
                  }
                }
              }
            }
          `;

          // Convert IDs to Shopify GIDs
          const gqlVariantIds = productVariantIds.map(id => `gid://shopify/ProductVariant/${id}`);
          console.log('GQL Variant IDs:', gqlVariantIds);

          // Use the request method with proper error handling
          const imageResponse = await gqlClient.request(imageQuery, {
            variantIds: gqlVariantIds
          });

          console.log('GraphQL response received:', JSON.stringify(imageResponse, null, 2));

          if (imageResponse && imageResponse.nodes) {
            variantImages = imageResponse.nodes.reduce((acc, node) => {
              if (node && node.id) {
                // Extract the numeric ID from the gid string
                const parts = node.id.split('/');
                const shortId = parts[parts.length - 1];
                
                // Use variant image if available, otherwise fallback to product image
                const imageUrl = node.image?.originalSrc || node.product?.featuredImage?.originalSrc || null;
                if (imageUrl) {
                  acc[shortId] = imageUrl;
                }
              }
              return acc;
            }, {});
            
            console.log('Processed variant images:', variantImages);
          }
        } catch (graphqlError) {
          // Log GraphQL error but continue with fallback
          console.error('Error fetching variant images via GraphQL:', graphqlError);
        }
      }
      
      // If GraphQL failed or we still don't have images, try REST API fallback
      if (Object.keys(variantImages).length === 0) {
        console.log('Attempting REST API fallback for product images');
        try {
          // Get product IDs from eligible items (assuming they have product_id)
          const productIds = [...new Set(eligibleItems
            .map(item => item.product_id)
            .filter(id => id != null))];
            
          // Fetch product data for each product to get images
          for (const productId of productIds) {
            try {
              const { body: productData } = await client.get({ 
                path: `products/${productId}` 
              });
              
              if (productData?.product) {
                // Map variant IDs to their images
                if (productData.product.variants) {
                  productData.product.variants.forEach(variant => {
                    if (variant.id && productVariantIds.includes(variant.id)) {
                      // If variant has image_id, find that image
                      if (variant.image_id && productData.product.images) {
                        const variantImage = productData.product.images.find(img => img.id === variant.image_id);
                        if (variantImage?.src) {
                          variantImages[variant.id] = variantImage.src;
                        }
                      }
                      // If we still don't have an image, use product featured image
                      if (!variantImages[variant.id] && productData.product.image?.src) {
                        variantImages[variant.id] = productData.product.image.src;
                      }
                    }
                  });
                }
              }
            } catch (err) {
              console.error(`Error fetching product ${productId}:`, err);
            }
          }
          
          console.log('REST API fallback images:', variantImages);
        } catch (restError) {
          console.error('Error in REST API fallback:', restError);
        }
      }
    }

    // Enrich eligible items with additional image fields
    const enrichedItems = eligibleItems.map(item => {
      const imageUrl = variantImages[item.variant_id] || null;
      return {
        ...item,
        imageUrl: imageUrl,
        variant_image: imageUrl, // Additional field for backward compatibility
        product_image: imageUrl  // Additional field for backward compatibility
      };
    });

    return res.status(200).json({
      id: body.order.id,
      order_number: body.order.order_number,
      email: body.order.email,
      created_at: body.order.created_at,
      processed_at: body.order.processed_at,
      customer: body.order.customer,
      shipping_address: body.order.shipping_address,
      line_items: enrichedItems,
      return_window_days: RETURN_WINDOW_DAYS,
      allow_exchanges: settings.allowExchanges,
    });
  } catch (err) {
    console.error('Error fetching Shopify order:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}