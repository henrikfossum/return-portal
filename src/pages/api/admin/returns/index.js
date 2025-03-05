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
      const { body } = await client.get({
        path: 'orders',
        query: {
          status: 'any',
          limit: 50, // Fetch more to allow for filtering
          financial_status: 'refunded,partially_refunded',
        }
      });
      
      const allOrders = body.orders || [];
      
      // Process orders to find returns
      // In a real implementation, you would use a dedicated returns API or database
      const returnsData = allOrders
        .filter(order => 
          order.refunds?.length > 0 || // Has refunds
          order.financial_status === 'refunded' || // Full refund
          order.financial_status === 'partially_refunded' || // Partial refund
          order.tags?.includes('Return') || // Tagged as return
          order.note?.toLowerCase().includes('return') // Return mentioned in notes
        )
        .map(order => {
          // Get return items from refunds
          const returnItems = order.refunds ? 
            order.refunds.reduce((total, refund) => 
              total + refund.refund_line_items.length, 0) : 0;
          
          // Calculate total refund amount
          const totalRefund = order.refunds ?
            order.refunds.reduce((total, refund) => 
              total + parseFloat(refund.transactions?.[0]?.amount || 0), 0) : 0;
          
          // Determine status based on refund state and tags
          let returnStatus = 'pending';
          
          if (order.financial_status === 'refunded') {
            returnStatus = 'completed';
          } else if (order.tags?.includes('approved') || order.tags?.includes('return-approved')) {
            returnStatus = 'approved';
          } else if (order.tags?.includes('flagged') || order.tags?.includes('return-flagged')) {
            returnStatus = 'flagged';
          } else if (order.tags?.includes('rejected') || order.tags?.includes('return-rejected')) {
            returnStatus = 'rejected';
          }
            
          return {
            id: `return-${order.id}`,
            order_id: `#${order.order_number}`,
            order_number: order.order_number,
            customer: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest Customer',
            email: order.email || 'No email provided',
            date: order.processed_at || order.created_at,
            status: returnStatus,
            items: returnItems || order.line_items?.length || 0,
            total: totalRefund || parseFloat(order.total_price),
            original_order: order
          };
        });
      
      // Apply filters
      let filteredReturns = returnsData;
      
      // Filter by status
      if (status && status !== 'all') {
        filteredReturns = filteredReturns.filter(r => r.status === status);
      }
      
      // Filter by date range
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
      
      // Filter by search term
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