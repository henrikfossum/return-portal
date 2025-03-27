// src/lib/shopify/returns.js (Enhanced version)
import { createApiError, ErrorTypes } from '@/lib/api/errorHandler';
import { graphqlClient, client as restClient } from './client';
import { getSettings } from '@/lib/fraud/detection';

/**
 * Process a return for a specific line item
 * @param {string} orderId - Order ID
 * @param {string} lineItemId - Line item ID
 * @param {number} quantity - Quantity to return
 * @returns {Promise<Object>} - Return processing result
 */
export async function processReturn(orderId, lineItemId, quantity = 1) {
  // Input validation
  if (!orderId || !lineItemId) {
    throw createApiError(
      ErrorTypes.BAD_REQUEST,
      'Missing required parameters: orderId or lineItemId'
    );
  }
  
  // Ensure quantity is a valid number
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    throw createApiError(
      ErrorTypes.BAD_REQUEST,
      'Invalid quantity. Must be a positive number.'
    );
  }

  // Convert IDs to global IDs if needed
  const orderGlobalId = orderId.toString().startsWith('gid://')
    ? orderId.toString()
    : `gid://shopify/Order/${orderId}`;
    
  const lineItemGlobalId = lineItemId.toString().startsWith('gid://')
    ? lineItemId.toString()
    : `gid://shopify/LineItem/${lineItemId}`;

  try {
    // Step 2: Check if item is eligible for return
    await verifyItemEligibility(orderId, lineItemId, qty);
    
    // Step 3: Find the fulfillment line item
    const fulfillmentLineItemId = await findFulfillmentLineItem(orderGlobalId, lineItemGlobalId);
    
    if (!fulfillmentLineItemId) {
      throw createApiError(
        ErrorTypes.ITEM_NOT_RETURNABLE,
        'Fulfillment line item not found. Item may not be fulfilled yet.',
        { orderId, lineItemId }
      );
    }
    
    // Step 4: Request the return
    const returnRequestData = await createReturnRequest(
      orderGlobalId,
      fulfillmentLineItemId,
      qty
    );
    
    // Step 5: Approve the return
    const returnId = returnRequestData?.return?.id;
    if (!returnId) {
      throw createApiError(
        ErrorTypes.INTERNAL_SERVER_ERROR,
        'Failed to create return request - no return ID received',
        { returnRequestData }
      );
    }
    
    const approveData = await approveReturn(returnId);
    
    // Step 6: Update order tags and notes
    await updateOrderWithReturnInfo(orderId, lineItemId, 'return', qty);
    
    return {
      success: true,
      message: "Return created and approved successfully",
      returnRequest: returnRequestData,
      returnApproval: approveData,
    };
  } catch (error) {
    // Handle Shopify API errors
    if (error.response && error.response.errors) {
      console.error('Shopify API Error:', error.response.errors);
      throw createApiError(
        ErrorTypes.SHOPIFY_API_ERROR,
        'Shopify API Error: ' + (error.response.errors[0]?.message || 'Unknown error'),
        { shopifyErrors: error.response.errors }
      );
    }
    
    // Re-throw ApiErrors
    if (error.code && error.status) {
      throw error;
    }
    
    // Handle general errors
    console.error('Error processing return:', error);
    throw createApiError(
      ErrorTypes.INTERNAL_SERVER_ERROR,
      'Error processing return: ' + error.message
    );
  }
}

/**
 * Verify that an order is eligible for returns
 */
async function verifyOrderEligibility(orderId) {
  try {
    // Fetch order details
    const { body } = await restClient.get({
      path: `orders/${orderId}`
    });

    if (!body?.order) {
      throw createApiError(
        ErrorTypes.NOT_FOUND,
        'Order not found',
        { orderId }
      );
    }

    const order = body.order;
    
    // Check order financial status
    const eligibleStatuses = ['paid', 'partially_refunded', 'partially_paid'];
    if (!eligibleStatuses.includes(order.financial_status)) {
      throw createApiError(
        ErrorTypes.ORDER_NOT_ELIGIBLE,
        `Order is not eligible for returns (status: ${order.financial_status})`,
        { financialStatus: order.financial_status }
      );
    }
    
    // Check if order is cancelled
    if (order.cancelled_at || order.status === 'cancelled') {
      throw createApiError(
        ErrorTypes.ORDER_NOT_ELIGIBLE,
        'Cancelled orders are not eligible for returns',
        { status: order.status }
      );
    }
    
    // Check return window
    const settings = await getSettings();
    const returnWindowDays = settings.returnWindowDays || 30;
    
    const orderDate = new Date(order.created_at);
    const now = new Date();
    const daysSinceOrder = Math.round((now - orderDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceOrder > returnWindowDays) {
      throw createApiError(
        ErrorTypes.RETURN_WINDOW_EXPIRED,
        `Return window expired (${daysSinceOrder} days since order, window is ${returnWindowDays} days)`,
        { daysSinceOrder, returnWindowDays }
      );
    }
    
    return order;
  } catch (error) {
    if (error.code && error.status) {
      throw error; // Rethrow ApiErrors
    }
    
    console.error('Error verifying order eligibility:', error);
    throw createApiError(
      ErrorTypes.INTERNAL_SERVER_ERROR,
      'Error verifying order eligibility: ' + error.message
    );
  }
}

/**
 * Verify that a specific line item is eligible for return
 */
async function verifyItemEligibility(orderId, lineItemId, quantity) {
  try {
    // Fetch order to get line item details
    const { body } = await restClient.get({
      path: `orders/${orderId}`
    });

    if (!body?.order) {
      throw createApiError(
        ErrorTypes.NOT_FOUND,
        'Order not found',
        { orderId }
      );
    }

    const order = body.order;
    
    // Find the line item
    const lineItem = order.line_items.find(item => item.id.toString() === lineItemId.toString());
    
    if (!lineItem) {
      throw createApiError(
        ErrorTypes.NOT_FOUND,
        'Line item not found in order',
        { orderId, lineItemId }
      );
    }
    
    // Check if item is fulfilled
    if (lineItem.fulfillment_status !== 'fulfilled') {
      throw createApiError(
        ErrorTypes.ITEM_NOT_RETURNABLE,
        'Item not fulfilled yet',
        { fulfillmentStatus: lineItem.fulfillment_status }
      );
    }
    
    // Check if item has already been fully refunded
    const existingRefunds = order.refunds
      .flatMap(refund => refund.refund_line_items)
      .filter(item => item.line_item_id.toString() === lineItemId.toString());
    
    const totalRefundedQuantity = existingRefunds.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalRefundedQuantity >= lineItem.quantity) {
      throw createApiError(
        ErrorTypes.ITEM_NOT_RETURNABLE,
        'Item already fully refunded',
        { refundedQuantity: totalRefundedQuantity, itemQuantity: lineItem.quantity }
      );
    }
    
    // Check if there's enough quantity left to return
    if (totalRefundedQuantity + quantity > lineItem.quantity) {
      throw createApiError(
        ErrorTypes.BAD_REQUEST,
        'Requested return quantity exceeds available quantity',
        { 
          requestedQuantity: quantity, 
          availableQuantity: lineItem.quantity - totalRefundedQuantity 
        }
      );
    }
    
    // Check for final sale properties
    const itemProperties = lineItem.properties || [];
    const isFinalSale = itemProperties.some(prop => 
      (prop.name === '_final_sale' && prop.value === 'true') ||
      (prop.name === 'final_sale' && prop.value === 'true')
    );
    
    if (isFinalSale) {
      throw createApiError(
        ErrorTypes.ITEM_NOT_RETURNABLE,
        'Item marked as final sale',
        { lineItemId }
      );
    }
    
    return true;
  } catch (error) {
    if (error.code && error.status) {
      throw error; // Rethrow ApiErrors
    }
    
    console.error('Error verifying item eligibility:', error);
    throw createApiError(
      ErrorTypes.INTERNAL_SERVER_ERROR,
      'Error verifying item eligibility: ' + error.message
    );
  }
}

/**
 * Find fulfillment line item for a return
 */
async function findFulfillmentLineItem(orderGlobalId, lineItemGlobalId) {
  const getFulfillmentLineItemQuery = `
    query GetOrder($id: ID!) {
      order(id: $id) {
        fulfillments {
          fulfillmentLineItems(first: 10) {
            edges {
              node {
                id
                lineItem {
                  id
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const fulfillmentResponse = await graphqlClient.query({
      data: {
        query: getFulfillmentLineItemQuery,
        variables: { id: orderGlobalId },
      },
    });

    // Check for GraphQL errors
    if (fulfillmentResponse.body?.errors) {
      const errors = fulfillmentResponse.body.errors;
      console.error('GraphQL errors in fulfillment query:', errors);
      throw createApiError(
        ErrorTypes.SHOPIFY_API_ERROR,
        'GraphQL errors in fulfillment query: ' + errors[0]?.message,
        { graphqlErrors: errors }
      );
    }

    const fulfillments = fulfillmentResponse.body?.data?.order?.fulfillments || [];
    
    for (const fulfillment of fulfillments) {
      const edges = fulfillment.fulfillmentLineItems?.edges || [];
      for (const { node } of edges) {
        if (node.lineItem.id === lineItemGlobalId) {
          return node.id;
        }
      }
    }
    
    return null;
  } catch (error) {
    if (error.code && error.status) {
      throw error; // Rethrow ApiErrors
    }
    
    console.error('Error finding fulfillment line item:', error);
    throw createApiError(
      ErrorTypes.INTERNAL_SERVER_ERROR,
      'Error finding fulfillment line item: ' + error.message
    );
  }
}

/**
 * Create a return request
 */
async function createReturnRequest(orderGlobalId, fulfillmentLineItemId, quantity) {
  const returnRequestMutation = `
    mutation returnRequest($input: ReturnRequestInput!) {
      returnRequest(input: $input) {
        return {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await graphqlClient.query({
      data: {
        query: returnRequestMutation,
        variables: {
          input: {
            orderId: orderGlobalId,
            returnLineItems: [
              {
                fulfillmentLineItemId,
                quantity: parseInt(quantity, 10),
                returnReason: "CUSTOMER_INITIATED",
                customerNote: "Return requested through return portal",
              },
            ],
          },
        },
      },
    });

    // Check for GraphQL errors
    if (response.body?.errors) {
      const errors = response.body.errors;
      console.error('GraphQL errors in return request:', errors);
      throw createApiError(
        ErrorTypes.SHOPIFY_API_ERROR,
        'GraphQL errors in return request: ' + errors[0]?.message,
        { graphqlErrors: errors }
      );
    }

    const returnRequestData = response.body?.data?.returnRequest;
    
    // Check for user errors
    if (returnRequestData?.userErrors && returnRequestData.userErrors.length > 0) {
      const userError = returnRequestData.userErrors[0];
      throw createApiError(
        ErrorTypes.BAD_REQUEST,
        `Failed to request return: ${userError.message}`,
        { userErrors: returnRequestData.userErrors }
      );
    }
    
    return returnRequestData;
  } catch (error) {
    if (error.code && error.status) {
      throw error; // Rethrow ApiErrors
    }
    
    console.error('Error creating return request:', error);
    throw createApiError(
      ErrorTypes.INTERNAL_SERVER_ERROR,
      'Error creating return request: ' + error.message
    );
  }
}

/**
 * Approve a return request
 */
async function approveReturn(returnId) {
  const approveReturnMutation = `
    mutation returnApproveRequest($input: ReturnApproveRequestInput!) {
      returnApproveRequest(input: $input) {
        return {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await graphqlClient.query({
      data: {
        query: approveReturnMutation,
        variables: {
          input: { id: returnId },
        },
      },
    });

    // Check for GraphQL errors
    if (response.body?.errors) {
      const errors = response.body.errors;
      console.error('GraphQL errors in approve return:', errors);
      throw createApiError(
        ErrorTypes.SHOPIFY_API_ERROR,
        'GraphQL errors in approve return: ' + errors[0]?.message,
        { graphqlErrors: errors }
      );
    }

    const approveData = response.body?.data?.returnApproveRequest;
    
    // Check for user errors
    if (approveData?.userErrors && approveData.userErrors.length > 0) {
      const userError = approveData.userErrors[0];
      throw createApiError(
        ErrorTypes.BAD_REQUEST,
        `Failed to approve return: ${userError.message}`,
        { userErrors: approveData.userErrors }
      );
    }
    
    return approveData;
  } catch (error) {
    if (error.code && error.status) {
      throw error; // Rethrow ApiErrors
    }
    
    console.error('Error approving return:', error);
    throw createApiError(
      ErrorTypes.INTERNAL_SERVER_ERROR,
      'Error approving return: ' + error.message
    );
  }
}

/**
 * Update order with return information
 */
async function updateOrderWithReturnInfo(orderId, lineItemId, returnType, quantity) {
  try {
    // Fetch the order to get current tags and notes
    const { body } = await restClient.get({
      path: `orders/${orderId}`
    });

    if (!body?.order) {
      return; // Silent fail, this is not critical
    }

    const order = body.order;
    
    // Prepare tags - add return tags
    let tags = (order.tags || '').split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    // Add 'Return' tag if not present
    if (!tags.includes('Return')) {
      tags.push('Return');
    }
    
    // Add return type tag if not present
    const returnTypeTag = returnType === 'exchange' ? 'Exchange' : 'Refund';
    if (!tags.includes(returnTypeTag)) {
      tags.push(returnTypeTag);
    }
    
    // Add return-approved tag
    if (!tags.includes('return-approved')) {
      tags.push('return-approved');
    }
    
    // Build return note
    const timestamp = new Date().toISOString();
    const returnNote = `[RETURN ${timestamp}] 
Type: ${returnType.toUpperCase()}
Line Item: ${lineItemId}
Quantity: ${quantity}
Status: Approved through return portal`;

    // Update the order with return info
    const combinedNote = order.note 
      ? `${order.note}\n\n${returnNote}`
      : returnNote;
      
    await restClient.put({
      path: `orders/${orderId}`,
      data: {
        order: {
          id: orderId,
          tags: tags.join(', '),
          note: combinedNote
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error updating order with return info:', error);
    // Do not throw - this is not critical
    return false;
  }
}

/**
 * Process an exchange
 */
export async function processExchange(orderId, lineItemId, variantId, quantity = 1) {
  try {
    // Ensure orderId is a string
    const safeOrderId = orderId ? orderId.toString() : null;
    
    if (!safeOrderId) {
      throw createApiError(
        ErrorTypes.BAD_REQUEST,
        'Invalid order ID for exchange'
      );
    }

    // Step 1: First validate variant is in stock
    await validateVariantAvailability(variantId);

    // Step 2: Process the return
    await processReturn(safeOrderId, lineItemId, quantity);
    
    // Step 3: Create a draft order for the exchange
    const draftOrderData = await createExchangeDraftOrder(variantId, quantity, safeOrderId);
    
    // Step 4: Complete the draft order
    const completedOrder = await completeDraftOrder(draftOrderData.draftOrder.id);
    
    // Step 5: Update order notes to link the orders
    await updateOrderNotes(safeOrderId, completedOrder.id, `Exchange for line item ${lineItemId}, variant ${variantId}`);
    
    return {
      success: true,
      message: "Exchange processed successfully",
      completedOrder,
    };
  } catch (error) {
    // Handle API errors
    if (error.code && error.status) {
      throw error;
    }
    
    console.error('Error processing exchange:', error);
    throw createApiError(
      ErrorTypes.INTERNAL_SERVER_ERROR,
      'Error processing exchange: ' + error.message
    );
  }
}

/**
 * Validate that a variant is available for exchange
 */
async function validateVariantAvailability(variantId) {
  try {
    // Convert ID format if needed
    const cleanVariantId = variantId.toString().replace(/\D/g, '');
    
    // Fetch variant details
    const { body } = await restClient.get({
      path: `variants/${cleanVariantId}`
    });

    if (!body?.variant) {
      throw createApiError(
        ErrorTypes.NOT_FOUND,
        'Variant not found',
        { variantId }
      );
    }

    const variant = body.variant;
    
    // Check inventory
    const inventoryQuantity = variant.inventory_quantity || 0;
    const inventoryPolicy = variant.inventory_policy || 'deny';
    
    if (inventoryPolicy === 'deny' && inventoryQuantity <= 0) {
      throw createApiError(
        ErrorTypes.CONFLICT,
        'Requested variant is out of stock',
        { 
          variantId, 
          inventoryQuantity,
          productTitle: variant.title || 'Product',
          sku: variant.sku || 'Unknown'
        }
      );
    }
    
    return variant;
  } catch (error) {
    if (error.code && error.status) {
      throw error; // Rethrow ApiErrors
    }
    
    console.error('Error validating variant availability:', error);
    throw createApiError(
      ErrorTypes.INTERNAL_SERVER_ERROR,
      'Error validating variant availability: ' + error.message
    );
  }
}

/**
 * Add cross-reference notes between original and exchange orders
 */
async function updateOrderNotes(originalOrderId, newOrderId, exchangeNotes = '') {
  try {
    // Use Shopify REST API to update order notes
    const updateOrderNoteMutation = `
      mutation orderUpdate($input: OrderInput!) {
        orderUpdate(input: $input) {
          order {
            id
            note
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await graphqlClient.query({
      data: {
        query: updateOrderNoteMutation,
        variables: {
          input: {
            id: `gid://shopify/Order/${originalOrderId}`,
            note: `Exchange processed. New order: ${newOrderId}. ${exchangeNotes}`
          }
        }
      }
    });

    const updateData = response.body?.data?.orderUpdate;
    
    if (updateData?.userErrors && updateData.userErrors.length > 0) {
      throw new Error(`Failed to update order notes: ${updateData.userErrors[0].message}`);
    }

    return updateData;
  } catch (error) {
    console.error('Error updating order notes:', error);
    throw error;
  }
}

/**
 * Create draft order for exchange
 */
async function createExchangeDraftOrder(variantId, quantity) {
  const variantGlobalId = variantId.toString().startsWith('gid://')
    ? variantId
    : `gid://shopify/ProductVariant/${variantId}`;
    
  const draftOrderCreateMutation = `
    mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          invoiceUrl
          totalPrice
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  
  try {
    const response = await graphqlClient.query({
      data: {
        query: draftOrderCreateMutation,
        variables: { 
          input: {
            lineItems: [
              {
                variantId: variantGlobalId,
                quantity,
              },
            ],
            appliedDiscount: {
              description: "Exchange Discount",
              title: "Exchange Discount",
              value: 100.0,
              valueType: "PERCENTAGE"
            },
            customAttributes: [
              {
                key: "exchange_order",
                value: "true"
              }
            ],
            tags: ["Exchange", "Replacement Order"]
          }
        },
      },
    });
    
    // Check for GraphQL errors
    if (response.body?.errors) {
      const errors = response.body.errors;
      console.error('GraphQL errors in create exchange draft order:', errors);
      throw createApiError(
        ErrorTypes.SHOPIFY_API_ERROR,
        'GraphQL errors in create exchange draft order: ' + errors[0]?.message,
        { graphqlErrors: errors }
      );
    }
    
    const draftOrderData = response.body?.data?.draftOrderCreate;
    
    // Check for user errors
    if (draftOrderData?.userErrors && draftOrderData.userErrors.length > 0) {
      const userError = draftOrderData.userErrors[0];
      throw createApiError(
        ErrorTypes.BAD_REQUEST,
        `Failed to create exchange order: ${userError.message}`,
        { userErrors: draftOrderData.userErrors }
      );
    }
    
    return draftOrderData;
  } catch (error) {
    if (error.code && error.status) {
      throw error; // Rethrow ApiErrors
    }
    
    console.error('Error creating exchange draft order:', error);
    throw createApiError(
      ErrorTypes.INTERNAL_SERVER_ERROR,
      'Error creating exchange draft order: ' + error.message
    );
  }
}

/**
 * Complete a draft order
 */
async function completeDraftOrder(draftOrderId) {
  const completeDraftOrderMutation = `
    mutation draftOrderComplete($id: ID!) {
      draftOrderComplete(id: $id) {
        draftOrder {
          order {
            id
            name
            tags
            note
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  
  try {
    const response = await graphqlClient.query({
      data: {
        query: completeDraftOrderMutation,
        variables: { id: draftOrderId },
      },
    });
    
    // Check for GraphQL errors
    if (response.body?.errors) {
      const errors = response.body.errors;
      console.error('GraphQL errors in complete draft order:', errors);
      throw createApiError(
        ErrorTypes.SHOPIFY_API_ERROR,
        'GraphQL errors in complete draft order: ' + errors[0]?.message,
        { graphqlErrors: errors }
      );
    }
    
    const completeData = response.body?.data?.draftOrderComplete;
    
    // Check for user errors
    if (completeData?.userErrors && completeData.userErrors.length > 0) {
      const userError = completeData.userErrors[0];
      throw createApiError(
        ErrorTypes.BAD_REQUEST,
        `Failed to complete exchange order: ${userError.message}`,
        { userErrors: completeData.userErrors }
      );
    }
    
    return completeData.draftOrder.order;
  } catch (error) {
    if (error.code && error.status) {
      throw error; // Rethrow ApiErrors
    }
    
    console.error('Error completing draft order:', error);
    throw createApiError(
      ErrorTypes.INTERNAL_SERVER_ERROR,
      'Error completing draft order: ' + error.message
    );
  }
}