// src/lib/fraud/detection.js
import fetch from 'node-fetch';

// Get tenant settings (fraud threshold, etc.)
export async function getSettings(tenantId = 'default') {
  try {
    // In a production environment, this would fetch from a database
    // For demo purposes, we'll use the settings API
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
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
}

// Get customer return history
export async function getCustomerReturnHistory(email, customerId, shopifyClient) {
  try {
    // Try to find previous orders by this customer
    const query = {};
    
    if (customerId) {
      query.customer_id = customerId;
    } else if (email) {
      query.email = email;
    } else {
      return { orders: [], returns: [] };
    }
    
    // Get orders for this customer
    const { body } = await shopifyClient.get({
      path: 'orders',
      query: {
        ...query,
        status: 'any',
        limit: 50
      }
    });
    
    const orders = body.orders || [];
    
    // Filter to just get returns
    const returns = orders.filter(order => 
      order.refunds?.length > 0 || 
      order.financial_status === 'refunded' || 
      order.financial_status === 'partially_refunded' ||
      order.tags?.includes('Return') ||
      order.note?.toLowerCase().includes('return')
    );
    
    return { orders, returns };
  } catch (error) {
    console.error('Error fetching customer return history:', error);
    return { orders: [], returns: [] };
  }
}

// Analyze a return for fraud risk
export async function analyzeReturnFraud(order, settings, shopifyClient) {
  if (!order || !settings.fraudPrevention.enabled) {
    return { riskFactors: [], riskScore: 0, isHighRisk: false };
  }
  
  const riskFactors = [];
  
  // Get customer information
  const customerId = order.customer?.id;
  const email = order.email;
  
  // Get customer history
  const { returns } = await getCustomerReturnHistory(email, customerId, shopifyClient);
  
  // Check for frequent returns
  if (settings.fraudPrevention.suspiciousPatterns.frequentReturns && 
      returns.length >= settings.fraudPrevention.maxReturnsPerCustomer) {
    riskFactors.push('Frequent Returns');
  }
  
  // Check for high-value returns
  const orderTotal = parseFloat(order.total_price || 0);
  let returnValue = 0;
  
  // Calculate return value based on selected items
  if (Array.isArray(order.line_items)) {
    returnValue = order.line_items.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0);
  } else if (order.refunds && order.refunds.length > 0) {
    returnValue = order.refunds.reduce((total, refund) => 
      total + parseFloat(refund.transactions?.[0]?.amount || 0), 0);
  }
  
  const returnPercent = orderTotal > 0 ? (returnValue / orderTotal) * 100 : 0;
  
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
  
  // Calculate risk score (1 point per risk factor)
  const riskScore = riskFactors.length;
  
  // Determine if this is high risk
  const isHighRisk = riskScore >= settings.fraudPrevention.autoFlagThreshold;
  
  return {
    riskFactors,
    riskScore,
    isHighRisk
  };
}

// Update order with fraud flags
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
      ...riskFactors.map(factor => `risk-${factor.toLowerCase().replace(/\s+/g, '-')}`)
    ];
    
    // Update the order with fraud flags
    const uniqueTags = [...new Set(tags)]; // Remove duplicates
    const { body } = await shopifyClient.put({
      path: `orders/${order.id}`,
      data: {
        order: {
          id: order.id,
          tags: uniqueTags.join(', '),
          note: order.note ? 
            `${order.note}\n\n[FRAUD ALERT] Risk factors: ${riskFactors.join(', ')}` : 
            `[FRAUD ALERT] Risk factors: ${riskFactors.join(', ')}`
        }
      }
    });
    
    return !!body?.order;
  } catch (error) {
    console.error('Error flagging fraudulent return:', error);
    return false;
  }
}