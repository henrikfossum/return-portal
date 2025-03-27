// src/pages/api/products/variants.js
import { getShopifyClientForTenant } from '@/lib/shopify/client';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only GET requests are accepted',
    });
  }

  const { productId } = req.query;
  const tenantId = req.headers['x-tenant-id'] || 'default';

  if (!productId) {
    return res.status(400).json({
      error: 'Missing Required Parameter',
      message: 'Product ID is required',
    });
  }

  try {
    // Get Shopify client for tenant
    const shopifyClients = await getShopifyClientForTenant(tenantId);
    const client = shopifyClients.rest;
    
    // Fetch the product with all its variants
    const { body } = await client.get({
      path: `products/${productId}`,
    });

    if (!body?.product) {
      return res.status(404).json({
        error: 'Product Not Found',
        message: 'Could not find a product with the provided ID',
      });
    }

    // Extract variant information
    const product = body.product;
    const variants = product.variants || [];
    
    // Get inventory levels for variants - FIXED APPROACH
    const variantsWithInventory = await Promise.all(
      variants.map(async (variant) => {
        try {
          // Instead of fetching individual inventory levels which might not exist,
          // use the variant information directly or fetch inventory items
          // Shopify API changed and not all variants have direct inventory_level endpoints
          
          // First try to get inventory data if available
          let inventory = 0;
          let isAvailable = false;
          
          try {
            // Try to get inventory item ID
            const { body: variantData } = await client.get({
              path: `variants/${variant.id}`,
            });
            
            if (variantData?.variant?.inventory_item_id) {
              // If we have inventory_item_id, try to get inventory level
              const { body: inventoryData } = await client.get({
                path: `inventory_items/${variantData.variant.inventory_item_id}`,
              });
              
              // Parse available inventory based on inventory policy and quantity
              if (inventoryData?.inventory_item) {
                inventory = variantData.variant.inventory_quantity || 0;
                
                // If inventory_policy is 'continue', item is available even with 0 inventory
                isAvailable = variantData.variant.inventory_policy === 'continue' || inventory > 0;
              }
            }
          } catch (inventoryError) {
            console.log(`Using fallback inventory check for variant ${variant.id}:`, inventoryError);
            // Fallback: Use the variant's own inventory fields
            inventory = variant.inventory_quantity || 0;
            isAvailable = variant.inventory_policy === 'continue' || inventory > 0;
          }
          
          
          return {
            ...variant,
            inventory,
            isAvailable
          };
        } catch (err) {
          console.error(`Error fetching inventory for variant ${variant.id}:`, err);
          return {
            ...variant,
            inventory: 0,
            isAvailable: false,
            error: err.message
          };
        }
      })
    );

    // Extract options (sizes, colors, etc.)
    const options = product.options || [];
    const availableOptions = {};
    
    // Create a map of option names to values
    options.forEach(option => {
      availableOptions[option.name.toLowerCase()] = option.values || [];
    });

    // Extract values from in-stock variants
    const inStockVariants = variantsWithInventory.filter(v => v.isAvailable);
    const inStockOptions = {};
    
    inStockVariants.forEach(variant => {
      // Parse option values from variant title
      if (variant.title) {
        const parts = variant.title.split(' / ');
        options.forEach((option, index) => {
          const optionName = option.name.toLowerCase();
          if (!inStockOptions[optionName]) {
            inStockOptions[optionName] = [];
          }
          if (parts[index] && !inStockOptions[optionName].includes(parts[index])) {
            inStockOptions[optionName].push(parts[index]);
          }
        });
      }
    });

    return res.status(200).json({
      productId: product.id,
      title: product.title,
      options,
      variants: variantsWithInventory,
      allOptions: availableOptions,
      inStockOptions,
      images: product.images || []
    });
  } catch (err) {
    console.error('Error fetching Shopify product variants:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}