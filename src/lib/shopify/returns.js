// src/lib/shopify/returns.js
import { graphqlClient } from './client';

export async function processReturn(orderId, lineItemId, quantity = 1) {
  // Convert IDs to global IDs if needed
  const orderGlobalId = orderId.toString().startsWith('gid://')
    ? orderId.toString()
    : `gid://shopify/Order/${orderId}`;
    
  const lineItemGlobalId = lineItemId.toString().startsWith('gid://')
    ? lineItemId.toString()
    : `gid://shopify/LineItem/${lineItemId}`;

  try {
    // Step 1: Find the fulfillment line item
    const fulfillmentLineItemId = await findFulfillmentLineItem(orderGlobalId, lineItemGlobalId);
    
    if (!fulfillmentLineItemId) {
      throw new Error('Fulfillment line item not found');
    }
    
    // Step 2: Request the return
    const returnRequestData = await createReturnRequest(
      orderGlobalId,
      fulfillmentLineItemId,
      quantity
    );
    
    // Step 3: Approve the return
    const returnId = returnRequestData?.return?.id;
    const approveData = await approveReturn(returnId);
    
    return {
      success: true,
      message: "Return created and approved successfully",
      returnRequest: returnRequestData,
      returnApproval: approveData,
    };
  } catch (error) {
    console.error('Error processing return:', error);
    throw error;
  }
}

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

  const fulfillmentResponse = await graphqlClient.query({
    data: {
      query: getFulfillmentLineItemQuery,
      variables: { id: orderGlobalId },
    },
  });

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
}

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
              returnReason: "UNWANTED",
              customerNote: "Customer initiated return",
            },
          ],
        },
      },
    },
  });

  const returnRequestData = response.body?.data?.returnRequest;
  
  if (returnRequestData?.userErrors && returnRequestData.userErrors.length > 0) {
    throw new Error(`Failed to request return: ${returnRequestData.userErrors[0].message}`);
  }
  
  return returnRequestData;
}

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

  const response = await graphqlClient.query({
    data: {
      query: approveReturnMutation,
      variables: {
        input: { id: returnId },
      },
    },
  });

  const approveData = response.body?.data?.returnApproveRequest;
  
  if (approveData?.userErrors && approveData.userErrors.length > 0) {
    throw new Error(`Failed to approve return: ${approveData.userErrors[0].message}`);
  }
  
  return approveData;
}

export async function processExchange(orderId, lineItemId, variantId, quantity = 1) {
  try {
    // Ensure orderId is a string
    const safeOrderId = orderId ? orderId.toString() : null;
    
    if (!safeOrderId) {
      throw new Error('Invalid order ID for exchange');
    }

    // Step 1: Process the return
    await processReturn(safeOrderId, lineItemId, quantity);
    
    // Step 2: Create a draft order for the exchange
    const draftOrderData = await createExchangeDraftOrder(variantId, quantity, safeOrderId);
    
    // Step 3: Complete the draft order
    const completedOrder = await completeDraftOrder(draftOrderData.draftOrder.id);
    
    // Step 4: Update order notes to link the orders
    await updateOrderNotes(safeOrderId, completedOrder.id, `Exchange for line item ${lineItemId}`);
    
    return {
      success: true,
      message: "Exchange processed successfully",
      completedOrder,
    };
  } catch (error) {
    console.error('Error processing exchange:', error);
    throw error;
  }
}

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
          }
        }
      },
    },
  });
  
  const draftOrderData = response.body?.data?.draftOrderCreate;
  
  if (draftOrderData?.userErrors && draftOrderData.userErrors.length > 0) {
    throw new Error(`Failed to create exchange order: ${draftOrderData.userErrors[0].message}`);
  }
  
  return draftOrderData;
}

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
  
  const response = await graphqlClient.query({
    data: {
      query: completeDraftOrderMutation,
      variables: { id: draftOrderId },
    },
  });
  
  const completeData = response.body?.data?.draftOrderComplete;
  
  if (completeData?.userErrors && completeData.userErrors.length > 0) {
    throw new Error(`Failed to complete exchange order: ${completeData.userErrors[0].message}`);
  }
  
  return completeData.draftOrder.order;
}
