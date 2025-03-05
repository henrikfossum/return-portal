// src/pages/api/admin/analytics.js
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
  
  // Only handle GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ 
      error: 'Method Not Allowed', 
      message: `Method ${req.method} is not allowed` 
    });
  }

  try {
    // Get date range filter from query
    const { timeframe = '30days' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case '7days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '12months':
        startDate.setMonth(endDate.getMonth() - 12);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30); // Default to 30 days
    }
    
    // Format dates for Shopify API (ISO format)
    const formattedStartDate = startDate.toISOString();
    const formattedEndDate = endDate.toISOString();
    
    // Get Shopify client
    const shopifyClients = await getShopifyClientForTenant(tenantId);
    const client = shopifyClients.rest;
    
    // Fetch orders for the date range
    const { body } = await client.get({
      path: 'orders',
      query: {
        status: 'any',
        limit: 250,
        created_at_min: formattedStartDate,
        created_at_max: formattedEndDate
      }
    });
    
    const orders = body.orders || [];
    
    // Identify returns
    const returns = orders.filter(order => 
      order.refunds?.length > 0 || 
      order.financial_status === 'refunded' || 
      order.financial_status === 'partially_refunded' ||
      order.tags?.includes('Return') ||
      order.note?.toLowerCase().includes('return')
    );
    
    // Calculate total orders and returns
    const totalOrders = orders.length;
    const totalReturns = returns.length;
    const returnRate = totalOrders > 0 ? (totalReturns / totalOrders) * 100 : 0;
    
    // Calculate total return value
    const totalReturnValue = returns.reduce((total, order) => {
      // If there are refunds, use the refund amount
      if (order.refunds && order.refunds.length > 0) {
        const refundTotal = order.refunds.reduce((sum, refund) => 
          sum + parseFloat(refund.transactions?.[0]?.amount || 0), 0);
        return total + refundTotal;
      }
      
      // Otherwise, use the order total
      return total + parseFloat(order.total_price || 0);
    }, 0);
    
    // Get return reasons (from refunds and tags)
    const reasonCounts = {};
    returns.forEach(order => {
      if (order.refunds) {
        order.refunds.forEach(refund => {
          refund.refund_line_items.forEach(item => {
            const reason = item.reason || 'Not specified';
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
          });
        });
      }
    });
    
    // Sort reasons by count, descending
    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count }));
    
    // Group by month for timeline data
    const monthlyData = {};
    
    orders.forEach(order => {
      const date = new Date(order.created_at);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          month: monthYear,
          orders: 0,
          returns: 0,
          returnRate: 0,
          returnValue: 0
        };
      }
      
      monthlyData[monthYear].orders += 1;
      
      const isReturn = order.refunds?.length > 0 || 
                       order.financial_status === 'refunded' || 
                       order.financial_status === 'partially_refunded' ||
                       order.tags?.includes('Return') ||
                       order.note?.toLowerCase().includes('return');
      
      if (isReturn) {
        monthlyData[monthYear].returns += 1;
        
        // Add return value
        if (order.refunds && order.refunds.length > 0) {
          const refundTotal = order.refunds.reduce((sum, refund) => 
            sum + parseFloat(refund.transactions?.[0]?.amount || 0), 0);
          monthlyData[monthYear].returnValue += refundTotal;
        } else {
          monthlyData[monthYear].returnValue += parseFloat(order.total_price || 0);
        }
      }
    });
    
    // Calculate return rates
    Object.keys(monthlyData).forEach(month => {
      const data = monthlyData[month];
      data.returnRate = data.orders > 0 ? (data.returns / data.orders) * 100 : 0;
    });
    
    // Convert to array and sort by month
    const timelineData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    
    // Return analytics data
    return res.status(200).json({
      summary: {
        totalOrders,
        totalReturns,
        returnRate: returnRate.toFixed(2),
        totalReturnValue: totalReturnValue.toFixed(2)
      },
      timeline: timelineData,
      reasons: topReasons,
      timeframe
    });
    
  } catch (err) {
    console.error('Error fetching analytics data:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}