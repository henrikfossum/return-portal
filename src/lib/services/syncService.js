import { getShopifyClientForTenant } from '@/lib/shopify/client';
import ReturnRequest from '@/lib/db/models/ReturnRequest';
import connectToDatabase from '@/lib/db/connection';

export async function syncReturnsWithShopify(tenantId = 'default') {
  await connectToDatabase();
  
  try {
    // Get Shopify client
    const shopifyClients = await getShopifyClientForTenant(tenantId);
    const client = shopifyClients.rest;
    
    // Get returns that need status update
    const pendingReturns = await ReturnRequest.find({ 
      tenantId,
      status: { $in: ['pending', 'approved'] }
    }).limit(100);
    
    for (const returnRequest of pendingReturns) {
      // Check status in Shopify
      try {
        const { body } = await client.get({
          path: `orders/${returnRequest.shopifyOrderId}`
        });
        
        if (body?.order) {
          // Update status if needed based on Shopify data
          // Your logic to determine status from Shopify order
        }
      } catch (error) {
        console.error(`Error syncing return ${returnRequest._id}:`, error);
      }
    }
    
    return { synced: pendingReturns.length };
  } catch (error) {
    console.error('Error syncing returns with Shopify:', error);
    throw error;
  }
}