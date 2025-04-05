// src/pages/api/admin/analytics.js
import jwt from 'jsonwebtoken';
import { getShopifyClientForTenant } from '@/lib/shopify/client';

// Get settings for fraud prevention
async function getSettings(tenantId) {
  // In a real app, this would be fetched from a database
  // For now, we'll use mock settings from our in-memory cache
  // or return defaults if not found
  try {
    const response = await fetch(`http://localhost:3000/api/admin/settings`, {
      headers: {
        'Authorization': 'Bearer demo-admin-token',
        'x-tenant-id': tenantId
      }
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Error fetching settings:", error);
  }
  
  // Return default settings if API call fails
  return {
    fraudPrevention: {
      enabled: true,
      maxReturnsPerCustomer: 3,
      maxReturnValuePercent: 80,
      suspiciousPatterns: {
        frequentReturns: true,
        highValueReturns: true,
        noReceiptReturns: true,
        newAccountReturns: true,
        addressMismatch: true
      },
      autoFlagThreshold: 2
    }
  };
}

// Analyze returns for fraud detection
function analyzeReturnsForFraud(orders, returns, settings) {
  const customers = {};
  const flaggedReturns = [];
  
  // Group returns by customer
  returns.forEach(order => {
    const customerId = order.customer?.id || order.email;
    if (!customerId) return;
    
    if (!customers[customerId]) {
      customers[customerId] = {
        id: customerId,
        email: order.email,
        name: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest',
        returns: [],
        totalReturnValue: 0
      };
    }
    
    // Add this order to the customer's returns
    customers[customerId].returns.push(order);
    
    // Calculate return value
    let returnValue = 0;
    if (order.refunds && order.refunds.length > 0) {
      returnValue = order.refunds.reduce((total, refund) => 
        total + parseFloat(refund.transactions?.[0]?.amount || 0), 0);
    } else {
      returnValue = parseFloat(order.total_price || 0);
    }
    
    customers[customerId].totalReturnValue += returnValue;
  });
  
  // Count of customers with multiple returns
  const repeatReturners = Object.values(customers).filter(c => c.returns.length > settings.fraudPrevention.maxReturnsPerCustomer).length;
  
  // Find suspicious returns based on settings
  returns.forEach(order => {
    const customerId = order.customer?.id || order.email;
    if (!customerId) return;
    
    const customer = customers[customerId];
    const riskFactors = [];
    
    // Check for frequent returns
    if (settings.fraudPrevention.suspiciousPatterns.frequentReturns && 
        customer.returns.length > settings.fraudPrevention.maxReturnsPerCustomer) {
      riskFactors.push('Frequent Returns');
    }
    
    // Check for high-value returns
    const orderTotal = parseFloat(order.total_price || 0);
    let returnValue = 0;
    if (order.refunds && order.refunds.length > 0) {
      returnValue = order.refunds.reduce((total, refund) => 
        total + parseFloat(refund.transactions?.[0]?.amount || 0), 0);
    } else {
      returnValue = orderTotal;
    }
    
    const returnPercent = (returnValue / orderTotal) * 100;
    if (settings.fraudPrevention.suspiciousPatterns.highValueReturns && 
        returnPercent > settings.fraudPrevention.maxReturnValuePercent) {
      riskFactors.push('High Value Return');
    }
    
    // Check for address mismatch
    if (settings.fraudPrevention.suspiciousPatterns.addressMismatch && 
        order.shipping_address && order.billing_address) {
      const shipping = order.shipping_address;
      const billing = order.billing_address;
      
      // Simple check - could be more sophisticated in production
      if (shipping.address1 !== billing.address1 || 
          shipping.city !== billing.city || 
          shipping.zip !== billing.zip) {
        riskFactors.push('Address Mismatch');
      }
    }
    
    // Check for new account returns
    if (settings.fraudPrevention.suspiciousPatterns.newAccountReturns && 
        order.customer && order.customer.created_at) {
      const accountAge = new Date(order.created_at) - new Date(order.customer.created_at);
      const accountAgeDays = accountAge / (1000 * 60 * 60 * 24);
      
      if (accountAgeDays < 30) { // Less than 30 days old
        riskFactors.push('New Account');
      }
    }
    
    // If enough risk factors are present, flag the return
    if (riskFactors.length >= settings.fraudPrevention.autoFlagThreshold) {
      flaggedReturns.push({
        id: order.id,
        order_id: `#${order.order_number}`,
        customer: customer.name,
        email: order.email,
        value: returnValue,
        date: order.created_at,
        risk_factors: riskFactors
      });
    }
  });
  
  // Calculate rate change
  // For simplicity, we'll just get a random percentage between -20 and 20
  // In a real app, this would compare current period to previous
  const rateChange = Math.round((Math.random() * 40) - 20);
  
  return {
    highRiskCount: flaggedReturns.length,
    repeatReturners,
    rateChange,
    flaggedReturns: flaggedReturns.slice(0, 5) // Just return top 5 for display
  };
}

export default async function handler(req, res) {
  // Check for admin authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token required' });
  }
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-jwt-secret-replace-in-production'
    );
    // Optionally, check user role or other properties here if needed.
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
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
          refund.refund_line_items?.forEach(item => {
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
    
    // Get fraud prevention settings
    const settings = await getSettings(tenantId);
    
    // Analyze returns for potential fraud
    const fraudStats = analyzeReturnsForFraud(orders, returns, settings);
    
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
      fraudStats,
      flaggedReturns: fraudStats.flaggedReturns,
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