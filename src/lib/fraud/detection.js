// Enhanced src/lib/fraud/detection.js
import fetch from 'node-fetch';

/**
 * Get tenant settings (fraud threshold, etc.)
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<Object>} - Tenant settings
 */
export async function getSettings(tenantId = 'default') {
  try {
    // In a production environment, this would fetch from a database
    // For demo purposes, use relative URL instead of hardcoded localhost
    const url = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_API_URL || '';
    
    const response = await fetch(`${url}/api/admin/settings`, {
      headers: {
        'Authorization': 'Bearer demo-admin-token',
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch settings');
    }
    
    const settings = await response.json();
    return settings;
  } catch (error) {
    console.error('Error fetching fraud settings:', error);
    
    // Return default settings if API call fails
    return {
      // Your default settings here
      fraudPrevention: {
        enabled: true,
        maxReturnsPerCustomer: 3,
        maxReturnValuePercent: 80,
        // etc.
      }
    };
  }
}

/**
 * Get customer return history with enhanced order tracking
 * @param {string} email - Customer email
 * @param {string} customerId - Customer ID
 * @param {Object} shopifyClient - Shopify API client
 * @returns {Promise<Object>} - Customer history data
 */
export async function getCustomerReturnHistory(email, customerId, shopifyClient) {
  try {
    // Try to find previous orders by this customer
    const query = {};
    
    if (customerId) {
      query.customer_id = customerId;
    } else if (email) {
      query.email = email;
    } else {
      return { orders: [], returns: [], metrics: { returnRate: 0 } };
    }
    
    // Get orders for this customer - increase limit to get more history
    const { body } = await shopifyClient.get({
      path: 'orders',
      query: {
        ...query,
        status: 'any',
        limit: 250 // Maximum allowed by Shopify API
      }
    });
    
    const orders = body.orders || [];
    
    // Enhance the filter to detect returns more accurately
    const returns = orders.filter(order => 
      order.refunds?.length > 0 || 
      order.financial_status === 'refunded' || 
      order.financial_status === 'partially_refunded' ||
      order.tags?.includes('Return') ||
      order.tags?.includes('Exchange') ||
      order.tags?.includes('Retur') || // Norwegian word for return
      order.tags?.includes('Bytte') || // Norwegian word for exchange
      order.note?.toLowerCase().includes('return') ||
      order.note?.toLowerCase().includes('exchange') ||
      order.note?.toLowerCase().includes('retur') ||
      order.note?.toLowerCase().includes('bytte')
    );
    
    // Calculate return rate metrics
    const metrics = {
      totalOrders: orders.length,
      returns: returns.length,
      returnRate: orders.length > 0 ? (returns.length / orders.length) * 100 : 0,
      averageOrderValue: orders.length > 0 ? 
        orders.reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0) / orders.length : 0,
      totalSpent: orders.reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0),
      lastOrderDate: orders.length > 0 ? 
        new Date(Math.max(...orders.map(o => new Date(o.created_at).getTime()))) : null,
      firstOrderDate: orders.length > 0 ? 
        new Date(Math.min(...orders.map(o => new Date(o.created_at).getTime()))) : null
    };
    
    return { orders, returns, metrics };
  } catch (error) {
    console.error('Error fetching customer return history:', error);
    return { orders: [], returns: [], metrics: { returnRate: 0 } };
  }
}

/**
 * Check item-level properties for return eligibility and fraud risk
 * @param {Array} items - Order line items 
 * @returns {Object} - Risk assessment and eligible items
 */
export function analyzeLineItems(items) {
  const flaggedItems = [];
  const eligibleItems = [];
  
  items.forEach(item => {
    // Look for risk indicators in item properties
    const properties = item.properties || [];
    const isFinalSale = properties.some(p => 
      p.name?.toLowerCase().includes('final') || 
      p.value?.toLowerCase().includes('final sale') ||
      p.value?.toLowerCase().includes('no return')
    );
    
    const isCustom = properties.some(p => 
      p.name?.toLowerCase().includes('custom') || 
      p.value?.toLowerCase().includes('customized') ||
      p.value?.toLowerCase().includes('personalized')
    );
    
    const isGift = properties.some(p => 
      p.name?.toLowerCase() === 'gift' || 
      p.value?.toLowerCase().includes('gift')
    );
    
    // Check high-value items
    const isHighValue = parseFloat(item.price) > 300;
    
    // Collect risk factors
    const riskFactors = [];
    if (isFinalSale) riskFactors.push('Final Sale Item');
    if (isCustom) riskFactors.push('Customized Item');
    if (isGift) riskFactors.push('Gift Item');
    if (isHighValue) riskFactors.push('High Value Item');
    
    if (riskFactors.length > 0) {
      flaggedItems.push({
        id: item.id,
        title: item.title || item.name,
        price: item.price,
        riskFactors
      });
    }
    
    // Determine eligibility (could be eligible despite risk flags, depending on policy)
    if (!isFinalSale && !isCustom) {
      eligibleItems.push(item.id);
    }
  });
  
  return {
    flaggedItems,
    eligibleItems,
    hasRiskyItems: flaggedItems.length > 0
  };
}

/**
 * Analyze a return for fraud risk with improved detection
 * @param {Object} order - Order data
 * @param {Object} settings - Tenant settings
 * @param {Object} shopifyClient - Shopify API client
 * @returns {Promise<Object>} - Risk assessment
 */
export async function analyzeReturnFraud(order, settings, shopifyClient) {
  if (!order || !settings.fraudPrevention.enabled) {
    return { riskFactors: [], riskScore: 0, isHighRisk: false };
  }
  
  const riskFactors = [];
  const riskDetails = {}; // Detailed explanation for each risk factor
  
  // Get customer information
  const customerId = order.customer?.id;
  const email = order.email;
  
  // Get customer history with enhanced metrics
  const { returns, metrics } = await getCustomerReturnHistory(email, customerId, shopifyClient);
  
  // Check for frequent returns
  if (settings.fraudPrevention.suspiciousPatterns.frequentReturns && 
      returns.length >= settings.fraudPrevention.maxReturnsPerCustomer) {
    riskFactors.push('Frequent Returns');
    riskDetails['Frequent Returns'] = `Customer has ${returns.length} previous returns`;
  }
  
  // Check for high return rate
  if (settings.fraudPrevention.suspiciousPatterns.highReturnRate && 
      metrics.returnRate > 50) { // Over 50% return rate
    riskFactors.push('High Return Rate');
    riskDetails['High Return Rate'] = `${metrics.returnRate.toFixed(0)}% of orders are returned`;
  }
  
  // Check for return after extended period
  if (settings.fraudPrevention.suspiciousPatterns.returnWindow) {
    const orderDate = new Date(order.created_at);
    const returnDate = new Date(); // Current date = return request date
    const daysSinceOrder = Math.round((returnDate - orderDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceOrder > 60) { // More than standard 60-day window 
      riskFactors.push('Extended Return Window');
      riskDetails['Extended Return Window'] = `Return requested ${daysSinceOrder} days after purchase`;
    }
  }
  
  // Check for high-value returns
  const orderTotal = parseFloat(order.total_price || 0);
  let returnValue = 0;
  
  // Calculate return value based on selected items
  if (Array.isArray(order.return_items)) {
    returnValue = order.return_items.reduce((total, returnItem) => {
      const orderItem = order.line_items.find(li => li.id.toString() === returnItem.id.toString());
      if (orderItem) {
        return total + (parseFloat(orderItem.price) * (returnItem.quantity || 1));
      }
      return total;
    }, 0);
  } else if (order.refunds && order.refunds.length > 0) {
    returnValue = order.refunds.reduce((total, refund) => 
      total + parseFloat(refund.transactions?.[0]?.amount || 0), 0);
  }
  
  const returnPercent = orderTotal > 0 ? (returnValue / orderTotal) * 100 : 0;
  
  if (settings.fraudPrevention.suspiciousPatterns.highValueReturns && 
      returnPercent > settings.fraudPrevention.maxReturnValuePercent) {
    riskFactors.push('High Value Return');
    riskDetails['High Value Return'] = `Return is ${returnPercent.toFixed(0)}% of order value`;
  }
  
  // Check for absolute high value (not just percentage)
  if (returnValue > 500) { // Over $500 return
    riskFactors.push('Large Return Amount');
    riskDetails['Large Return Amount'] = `Return value is ${returnValue.toFixed(2)}`;
  }
  
  // Check for address mismatch
  if (settings.fraudPrevention.suspiciousPatterns.addressMismatch && 
      order.shipping_address && order.billing_address) {
    const shipping = order.shipping_address;
    const billing = order.billing_address;
    
    // More comprehensive address comparison
    const hasAddressMismatch = (
      shipping.address1 !== billing.address1 || 
      shipping.city !== billing.city || 
      shipping.zip !== billing.zip ||
      shipping.country !== billing.country ||
      shipping.province !== billing.province
    );
    
    // Name mismatch is also suspicious
    const hasNameMismatch = (
      shipping.name !== billing.name ||
      (shipping.first_name && billing.first_name && shipping.first_name !== billing.first_name) ||
      (shipping.last_name && billing.last_name && shipping.last_name !== billing.last_name)
    );
    
    if (hasAddressMismatch) {
      riskFactors.push('Address Mismatch');
      riskDetails['Address Mismatch'] = 'Shipping and billing addresses do not match';
    }
    
    if (hasNameMismatch) {
      riskFactors.push('Name Mismatch');
      riskDetails['Name Mismatch'] = 'Shipping and billing names do not match';
    }
  }
  
  // Check for new account returns
  if (settings.fraudPrevention.suspiciousPatterns.newAccountReturns && 
      order.customer && order.customer.created_at) {
    const accountAge = new Date(order.created_at) - new Date(order.customer.created_at);
    const accountAgeDays = accountAge / (1000 * 60 * 60 * 24);
    
    if (accountAgeDays < 30) { // Less than 30 days old
      riskFactors.push('New Account');
      riskDetails['New Account'] = `Account was created ${Math.round(accountAgeDays)} days before purchase`;
    }
  }
  
  // Check for returns from multiple devices/locations
  if (settings.fraudPrevention.suspiciousPatterns.multipleDevices &&
      returns.length > 0) {
    // This would require storing device/IP information in a real implementation
    // For now, we'll use a placeholder
    const uniqueIPs = new Set();
    uniqueIPs.add('127.0.0.1'); // Placeholder
    
    if (uniqueIPs.size > 2) { // More than 2 different devices/IPs
      riskFactors.push('Multiple Devices');
      riskDetails['Multiple Devices'] = `Returns initiated from ${uniqueIPs.size} different locations`;
    }
  }
  
  // Check specific items for risk (final sale, customized, etc.)
  const itemAnalysis = analyzeLineItems(order.line_items || []);
  
  if (itemAnalysis.hasRiskyItems) {
    riskFactors.push('Risky Items');
    riskDetails['Risky Items'] = `Order contains ${itemAnalysis.flaggedItems.length} flagged items`;
    
    // Add item-specific details
    itemAnalysis.flaggedItems.forEach(item => {
      riskDetails[`Item ${item.id}`] = `${item.title}: ${item.riskFactors.join(', ')}`;
    });
  }
  
  // Calculate risk score (1 point per risk factor)
  const riskScore = riskFactors.length;
  
  // Determine if this is high risk
  const isHighRisk = riskScore >= settings.fraudPrevention.autoFlagThreshold;
  
  return {
    riskFactors,
    riskDetails,
    riskScore,
    isHighRisk,
    customerMetrics: metrics,
    itemAnalysis
  };
}

/**
 * Update order with fraud flags
 * @param {Object} order - Order data
 * @param {Array} riskFactors - Identified risk factors
 * @param {Object} shopifyClient - Shopify API client
 * @returns {Promise<boolean>} - Success indicator
 */
export async function flagFraudulentReturn(order, riskFactors, shopifyClient) {
  if (!order || !Array.isArray(riskFactors) || riskFactors.length === 0) {
    return false;
  }
  
  try {
    // Get existing tags
    const existingTags = (order.tags || '').split(',').map(tag => tag.trim());
    
    // Add fraud tags
    const tags = [
      ...existingTags,
      'flagged',
      'potential-fraud',
      'high-risk-return',
      ...riskFactors.map(factor => `risk-${factor.toLowerCase().replace(/\s+/g, '-')}`)
    ];
    
    // Generate a detailed fraud note with timestamp
    const fraudNote = `[FRAUD ALERT ${new Date().toISOString()}] 
Risk factors: ${riskFactors.join(', ')}
Risk score: ${riskFactors.length}
Flagged by automated system for manual review.`;
    
    // Update the order with fraud flags
    const uniqueTags = [...new Set(tags)]; // Remove duplicates
    const { body } = await shopifyClient.put({
      path: `orders/${order.id}`,
      data: {
        order: {
          id: order.id,
          tags: uniqueTags.join(', '),
          note: order.note ? 
            `${order.note}\n\n${fraudNote}` : 
            fraudNote
        }
      }
    });
    
    // Also create a ticket or notification for review in a real implementation
    // This would integrate with a ticketing system, email alerts, etc.
    
    return !!body?.order;
  } catch (error) {
    console.error('Error flagging fraudulent return:', error);
    return false;
  }
}

/**
 * Determine if an order is eligible for return based on comprehensive criteria
 * @param {Object} order - Full order data
 * @param {Object} settings - Tenant settings
 * @returns {Object} - Eligibility result with detailed reasons
 */
export function checkOrderEligibility(order, settings) {
  if (!order) {
    return { 
      isEligible: false, 
      reasons: ['Order not found'] 
    };
  }
  
  const ineligibilityReasons = [];
  
  // Check if order is paid
  const isPaid = ['paid', 'partially_refunded', 'partially_paid'].includes(order.financial_status);
  if (!isPaid) {
    ineligibilityReasons.push(`Order not fully paid (status: ${order.financial_status})`);
  }
  
  // Check if order is cancelled
  if (order.cancelled_at || order.status === 'cancelled') {
    ineligibilityReasons.push('Order was cancelled');
  }
  
  // Check for special "no returns" tags
  const orderTags = (order.tags || '').toLowerCase().split(',').map(t => t.trim());
  if (orderTags.includes('final-sale') || orderTags.includes('no-returns') || orderTags.includes('no-return')) {
    ineligibilityReasons.push('Order marked as final sale');
  }
  
  // Check if order is too old
  const orderDate = new Date(order.created_at);
  const now = new Date();
  const daysSinceOrder = Math.round((now - orderDate) / (1000 * 60 * 60 * 24));
  const returnWindowDays = settings?.returnWindowDays || 30;
  
  if (daysSinceOrder > returnWindowDays) {
    ineligibilityReasons.push(`Order is outside ${returnWindowDays}-day return window (${daysSinceOrder} days old)`);
  }
  
  // Return result
  return {
    isEligible: ineligibilityReasons.length === 0,
    reasons: ineligibilityReasons
  };
}