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
    
    // Get inventory levels for variants
    const variantsWithInventory = await Promise.all(
      variants.map(async (variant) => {
        try {
          const { body: inventoryBody } = await client.get({
            path: `variants/${variant.id}/inventory_level`,
          });
          
          return {
            ...variant,
            inventory: inventoryBody?.inventory_level?.available || 0,
            isAvailable: (inventoryBody?.inventory_level?.available || 0) > 0
          };
        } catch (err) {
          console.error(`Error fetching inventory for variant ${variant.id}:`, err);
          return {
            ...variant,
            inventory: 0,
            isAvailable: false
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