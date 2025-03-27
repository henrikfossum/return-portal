// src/pages/api/admin/returns/index.js
import { getShopifyClientForTenant } from '@/lib/shopify/client';

// Simple in-memory cache for orders
let ordersCache = {
  data: null,
  timestamp: null,
  expiresIn: 5 * 60 * 1000 // 5 minutes cache
};

// Simple rate limiter to prevent Shopify throttling
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // 500ms = 2 requests/second max

// Utility for rate-limited API requests
async function rateLimitedRequest(requestFn) {
  const now = Date.now();
  const timeElapsed = now - lastRequestTime;
  
  // If we've made a request too recently, wait before making another
  if (timeElapsed < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeElapsed)
    );
  }
  
  // Record this request time
  lastRequestTime = Date.now();
  
  // Execute the request
  return requestFn();
}

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
      
      // Check if we have a valid cache
      let allOrders = [];
      const now = Date.now();
      
      if (ordersCache.data && ordersCache.timestamp && 
          (now - ordersCache.timestamp < ordersCache.expiresIn)) {
        // Use cached data
        allOrders = ordersCache.data;
        console.log('Using cached orders data');
      } else {
        // Cache is invalid or expired, fetch new data
        console.log("Fetching orders from Shopify");
        
        try {
          // Use rate-limited request
          const { body } = await rateLimitedRequest(() => 
            client.get({
              path: 'orders',
              query: {
                status: 'any',
                limit: 250, // Maximum allowed by Shopify API
              }
            })
          );
          
          allOrders = body.orders || [];
          
          // Update cache
          ordersCache = {
            data: allOrders,
            timestamp: now,
            expiresIn: 5 * 60 * 1000 // 5 minutes
          };
          
          console.log(`Retrieved ${allOrders.length} orders`);
        } catch (error) {
          console.error('Shopify API error:', error.message);
          
          // If throttling error, retry after delay
          if (error.message && error.message.includes('throttling')) {
            console.log('Rate limit exceeded, waiting for 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Retry after waiting
            const { body } = await client.get({
              path: 'orders',
              query: {
                status: 'any',
                limit: 250,
              }
            });
            
            allOrders = body.orders || [];
            
            // Update cache
            ordersCache = {
              data: allOrders,
              timestamp: now,
              expiresIn: 5 * 60 * 1000
            };
          } else {
            // For other errors, rethrow
            throw error;
          }
        }
      }
      
      // Process orders to find returns (keeping this logic the same)
      const returnsData = allOrders
        .filter(order => {
          const tagsArray = order.tags
            ? order.tags.split(',').map(tag => tag.trim().toLowerCase())
            : [];
            
          const orderNote = order.note?.toLowerCase() || '';
          const financialStatus = order.financial_status?.toLowerCase() || '';
            
          // Check for any return-related indicators
          const hasRefunds = order.refunds && order.refunds.length > 0;
          
          const returnKeywords = ['return', 'retur', 'bytte', 'exchange', 'refund', 'refusjon'];
          const hasReturnTag = tagsArray.some(tag => 
            returnKeywords.some(keyword => tag.includes(keyword))
          );
          
          const hasReturnNote = returnKeywords.some(keyword => 
            orderNote.includes(keyword)
          );
          
          const returnStatuses = [
            'refunded', 'partially_refunded', 'refundert', 
            'delvis_refundert', 'retur pågår', 'delvis fullført'
          ];
          const hasReturnStatus = returnStatuses.some(rs => 
            financialStatus.includes(rs)
          );
          
          const norwegianIndicators = [
            'delvis', 'sluttført', 'ferdig', 'informasjon'
          ];
          const hasNorwegianIndicator = norwegianIndicators.some(word =>
            tagsArray.some(tag => tag.includes(word)) || 
            orderNote.includes(word) ||
            financialStatus.includes(word)
          );
          
          return hasRefunds || hasReturnTag || hasReturnNote || 
                hasReturnStatus || hasNorwegianIndicator;
        })
        .map(order => {
          try {
            // (Rest of the mapping logic remains the same)
            const tagsArray = order.tags
              ? order.tags.split(',').map(tag => tag.trim().toLowerCase())
              : [];
              
            const orderNote = order.note?.toLowerCase() || '';
            const financialStatus = order.financial_status?.toLowerCase() || '';

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

            // Determine status based on various indicators
            let returnStatus = 'pending'; // Default status
            
            // Check Norwegian status words
            const statusMappings = {
              // Norwegian status terms
              'ferdig': 'completed',
              'sluttført': 'completed',
              'refundert': 'completed',
              'godkjent': 'approved',
              'avvist': 'rejected',
              'flagget': 'flagged',
              'pågår': 'pending',
              'delvis': 'approved', // "partially" typically means approved but not completed
              
              // English status terms
              'completed': 'completed',
              'approved': 'approved',
              'rejected': 'rejected',
              'flagged': 'flagged',
              'pending': 'pending'
            };
            
            // Check tags first
            for (const [keyword, status] of Object.entries(statusMappings)) {
              if (tagsArray.some(tag => tag.includes(keyword))) {
                returnStatus = status;
                break;
              }
            }
            
            // Financial status indicators
            if (financialStatus === 'refunded') {
              returnStatus = 'completed';
            } else if (financialStatus === 'partially_refunded') {
              if (returnStatus === 'pending') {
                returnStatus = 'approved';
              }
            }
            
            // Explicit return tags override financial status
            if (tagsArray.includes('return-approved') || tagsArray.includes('retur-godkjent')) {
              returnStatus = 'approved';
            } else if (tagsArray.includes('return-flagged') || tagsArray.includes('retur-flagget')) {
              returnStatus = 'flagged';
            } else if (tagsArray.includes('return-rejected') || tagsArray.includes('retur-avvist')) {
              returnStatus = 'rejected';
            } else if (tagsArray.includes('return-completed') || tagsArray.includes('retur-fullført')) {
              returnStatus = 'completed';
            }
            
            // Check if order is fully refunded
            const isFullyRefunded = financialStatus === 'refunded' || 
              (order.refunds && 
              order.line_items && 
              order.line_items.every(item => 
                order.refunds.some(refund => 
                  refund.refund_line_items.some(ri => ri.line_item_id === item.id && ri.quantity === item.quantity)
                )
              ));

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
              items: returnItems || order.line_items?.length || 0,
              total: totalRefund || parseFloat(order.total_price),
              is_fully_refunded: isFullyRefunded
            };
          } catch (err) {
            console.error('Error processing order:', order.id, err);
            return null;
          }
        })
        .filter(Boolean); // Filter out any null results from errors
        
      console.log(`Found ${returnsData.length} returns`);

      // Apply filters (same logic as before)
      let filteredReturns = returnsData;

      if (status && status !== 'all') {
        filteredReturns = filteredReturns.filter(r => r.status === status);
      }

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
      
      if (search) {
        const searchTerm = search.toLowerCase();
        filteredReturns = filteredReturns.filter(r => 
          r.customer?.toLowerCase().includes(searchTerm) ||
          r.email?.toLowerCase().includes(searchTerm) ||
          r.order_id?.toLowerCase().includes(searchTerm)
        );
      }
      
      // Sort by date (newest first)
      filteredReturns.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Pagination
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = parseInt(page) * parseInt(limit);
      const paginatedReturns = filteredReturns.slice(startIndex, endIndex);
      
      // Return summary statistics
      return res.status(200).json({
        returns: paginatedReturns,
        total: filteredReturns.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(filteredReturns.length / parseInt(limit)),
        stats: {
          totalReturns: returnsData.length,
          pendingReturns: returnsData.filter(r => r.status === 'pending').length,
          approvedReturns: returnsData.filter(r => r.status === 'approved').length,
          completedReturns: returnsData.filter(r => r.status === 'completed').length,
          flaggedReturns: returnsData.filter(r => r.status === 'flagged').length,
          rejectedReturns: returnsData.filter(r => r.status === 'rejected').length
        }
      });
      
    } catch (err) {
      console.error('Error fetching admin returns:', err);
      return res.status(500).json({
        error: 'Server Error',
        message: `Error fetching admin returns: ${err.message}`,
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