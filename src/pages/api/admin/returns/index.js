// src/pages/api/admin/returns/index.js
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

  const tenantId = req.headers['x-tenant-id'] || 'default';

  // Handle GET method (fetch returns)
  if (req.method === 'GET') {
    try {
      const { status, dateRange, page = 1, limit = 10, search } = req.query;
      
      // Get Shopify client
      const shopifyClients = await getShopifyClientForTenant(tenantId);
      const client = shopifyClients.rest;
      
      // Fetch orders with status "any" to include all possible returns
      // NOTE: This only pulls the first 50 orders! If you have more orders than 50,
      // you may need to implement pagination to fetch additional pages.
      const { body } = await client.get({
        path: 'orders',
        query: {
          status: 'any',
          limit: 50, // or 250, then handle pagination to truly get them all
          financial_status: 'refunded,partially_refunded',
        }
      });
      
      const allOrders = body.orders || [];
      
      // Process orders to find returns.
      // We'll parse tags into arrays, then match any "return" tag or partial/full refund, etc.
      const returnsData = allOrders
        .filter(order => {
          const tagsArray = order.tags
            ? order.tags.split(',').map(tag => tag.trim().toLowerCase())
            : [];

          return (
            // Has at least one refund
            (order.refunds && order.refunds.length > 0) ||
            // Financial status indicates a refund
            ['refunded', 'partially_refunded'].includes(order.financial_status) ||
            // Has any "return" or stage-specific tag
            tagsArray.some(t =>
              [
                'return',
                'return-pending',
                'return-approved',
                'return-flagged',
                'return-rejected',
                // (Optional) If you also want these short tags recognized
                'approved',
                'flagged',
                'rejected'
              ].includes(t)
            ) ||
            // Mentioned "return" in the note
            order.note?.toLowerCase().includes('return')
          );
        })
        .map(order => {
          const tagsArray = order.tags
            ? order.tags.split(',').map(tag => tag.trim().toLowerCase())
            : [];

          // Count refunded line items if any
          const returnItems = order.refunds 
            ? order.refunds.reduce(
                (total, refund) => total + refund.refund_line_items.length,
                0
              )
            : 0;

          // Calculate total refund amount
          const totalRefund = order.refunds
            ? order.refunds.reduce(
                (total, refund) =>
                  total + parseFloat(refund.transactions?.[0]?.amount || 0),
                0
              )
            : 0;

          // Determine status based on tags and financial status
          let returnStatus = 'pending';

          // If fully refunded
          if (order.financial_status === 'refunded') {
            returnStatus = 'completed';
          }
          // If partially refunded, you can decide if that is "completed" or keep it as "pending"
          else if (order.financial_status === 'partially_refunded') {
            // Some teams might mark partial refunds as "completed" if they're final,
            // or keep them at 'pending/approved' if there's more to do.
            // Adjust as you prefer. We'll leave it at "pending" unless tags override it.
          }

          // If there's a tag that indicates a specific stage
          if (tagsArray.includes('return-approved') || tagsArray.includes('approved')) {
            returnStatus = 'approved';
          } else if (tagsArray.includes('return-flagged') || tagsArray.includes('flagged')) {
            returnStatus = 'flagged';
          } else if (tagsArray.includes('return-rejected') || tagsArray.includes('rejected')) {
            returnStatus = 'rejected';
          } else if (tagsArray.includes('return-pending')) {
            returnStatus = 'pending';
          }

          return {
            id: `return-${order.id}`,
            order_id: `#${order.order_number}`,
            order_number: order.order_number,
            customer: order.customer
              ? `${order.customer.first_name} ${order.customer.last_name}`
              : 'Guest Customer',
            email: order.email || 'No email provided',
            date: order.processed_at || order.created_at,
            status: returnStatus,
            // If no refunded line items, fallback to total line_items count
            items: returnItems || order.line_items?.length || 0,
            // If no partial refunds, fallback to total price
            total: totalRefund || parseFloat(order.total_price),
            original_order: order
          };
        });
      
      // Apply filters (status, date range, search)
      let filteredReturns = returnsData;

      // 1) Filter by status
      if (status && status !== 'all') {
        filteredReturns = filteredReturns.filter(r => r.status === status);
      }

      // 2) Filter by date range
      if (dateRange && dateRange !== 'all') {
        const now = new Date();
        let cutoffDate = new Date();
        
        if (dateRange === 'today') {
          cutoffDate.setHours(0, 0, 0, 0);
        } else if (dateRange === 'week') {
          cutoffDate.setDate(now.getDate() - 7);
        } else if (dateRange === 'month') {
          cutoffDate.setMonth(now.getMonth() - 1);
        } else if (dateRange === 'quarter') {
          cutoffDate.setMonth(now.getMonth() - 3);
        }
        
        filteredReturns = filteredReturns.filter(r => 
          new Date(r.date) >= cutoffDate
        );
      }
      
      // 3) Filter by search term (order ID, customer name, or email)
      if (search) {
        const searchTerm = search.toLowerCase();
        filteredReturns = filteredReturns.filter(r => 
          r.customer.toLowerCase().includes(searchTerm) ||
          r.email.toLowerCase().includes(searchTerm) ||
          r.order_id.toLowerCase().includes(searchTerm)
        );
      }
      
      // Sort by date (newest first)
      filteredReturns.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Pagination
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = parseInt(page) * parseInt(limit);
      const paginatedReturns = filteredReturns.slice(startIndex, endIndex);
      
      // Return summary statistics with the results
      return res.status(200).json({
        returns: paginatedReturns,
        total: filteredReturns.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(filteredReturns.length / parseInt(limit)),
        stats: {
          totalReturns: returnsData.length,
          pendingReturns: returnsData.filter(r => r.status === 'pending').length,
          completedReturns: returnsData.filter(r => r.status === 'completed').length,
          flaggedReturns: returnsData.filter(r => r.status === 'flagged').length
          // You could add 'approvedReturns' or 'rejectedReturns' similarly if you want
        }
      });
      
    } catch (err) {
      console.error('Error fetching admin returns:', err);
      return res.status(500).json({
        error: 'Server Error',
        message: 'An error occurred while processing your request',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
  
  // Handle other methods
  res.setHeader('Allow', ['GET']);
  return res.status(405).json({ 
    error: 'Method Not Allowed',
    message: `Method ${req.method} is not allowed` 
  });
}
