// src/hooks/useReturnFlow.js
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useReturnContext } from '@/lib/context/ReturnContext';

export function useReturnFlow() {
  const router = useRouter();
  const {
    order,
    itemsToReturn,
    returnReasons,
    returnOptions,
    loading,
    error,
    setOrder,
    selectItems,
    setReturnReason,
    setReturnOption,
    setLoading,
    setError,
    resetState,
  } = useReturnContext();

  // Local state for selected item quantities (moved up)
  const [selectedItems, setSelectedItems] = useState({});

  // Lookup an order by ID and email
  const lookupOrder = useCallback(async (orderId, email) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Order not found. Please check your order ID and email.');
      }

      const orderData = await response.json();
      setOrder(orderData);
      
      // Navigate to the order details page
      router.push('/order-details');
      return orderData;
    } catch (err) {
      setError(err.message || 'An error occurred while looking up your order.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setOrder, router]);

  // Update the quantity of an item to return
  const updateItemQuantity = useCallback((itemId, quantity) => {
    if (!order) return;
    
    const updatedSelectedItems = { ...selectedItems };
    
    if (quantity <= 0) {
      delete updatedSelectedItems[itemId];
    } else {
      updatedSelectedItems[itemId] = quantity;
    }
    
    setSelectedItems(updatedSelectedItems);
  }, [order, selectedItems, setSelectedItems]);

  // Select items for return
  const selectItemsForReturn = useCallback(() => {
    if (!order) return;
    
    const items = Object.entries(selectedItems)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, quantity]) => {
        const item = order.line_items.find(i => i.id.toString() === itemId);
        if (!item) return null;
        
        return {
          ...item,
          quantity
        };
      })
      .filter(Boolean);
    
    if (items.length === 0) {
      setError('Please select at least one item to return');
      return false;
    }
    
    selectItems(items);
    return true;
  }, [order, selectedItems, selectItems, setError]);

  // Set a reason for returning an item
  const setItemReturnReason = useCallback((itemId, reason) => {
    setReturnReason(itemId, reason);
    
    // Find current item index
    const currentIndex = itemsToReturn.findIndex(i => i.id.toString() === itemId);
    
    // If there are more items, go to the next one
    if (currentIndex < itemsToReturn.length - 1) {
      const nextItemId = itemsToReturn[currentIndex + 1].id;
      router.push(`/return-reason/${nextItemId}`);
    } else {
      // All reasons set, proceed to next step
      const firstItemId = itemsToReturn[0].id;
      router.push(`/return-options/${firstItemId}`);
    }
  }, [itemsToReturn, setReturnReason, router]);

  // Set a return option (return or exchange) for an item
  const setItemReturnOption = useCallback((itemId, option, details = null) => {
    setReturnOption(itemId, option, details);
    
    // Find current item index
    const currentIndex = itemsToReturn.findIndex(i => i.id.toString() === itemId);
    
    // If there are more items, go to the next one
    if (currentIndex < itemsToReturn.length - 1) {
      const nextItemId = itemsToReturn[currentIndex + 1].id;
      router.push(`/return-options/${nextItemId}`);
    } else {
      // All options set, proceed to review
      router.push('/return-review');
    }
  }, [itemsToReturn, setReturnOption, router]);

  // Complete the return/exchange process
  const completeReturn = useCallback(async () => {
    if (!order || itemsToReturn.length === 0) {
      setError('No items selected for return');
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Enhance items with orderId and other required fields
      const enhancedItems = itemsToReturn.map(item => ({
        id: item.id,
        orderId: order.id,
        returnOption: item.returnOption || 'return',
        exchangeDetails: item.returnOption === 'exchange' ? item.exchangeDetails : null,
        quantity: item.quantity || 1
      }));
      
      // DEBUG: Log the payload
      console.log('Batch Process Payload:', {
        items: enhancedItems,
        orderDetails: order
      });
      
      // Use the real Shopify API endpoint
      const apiEndpoint = '/api/returns/batch-process';
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: enhancedItems }),
      });
      
      let result;
      try {
        result = await response.json();
        
        // Check for successful response
        if (!response.ok) {
          throw new Error(result.message || 'Failed to process return');
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Unable to process return');
      }
      
      console.log('Return processing result:', result);
      
      // Force navigation to success page
      await router.push('/success');
      resetState(); 
      return true;
      
    } catch (err) {
      console.error('Error in completeReturn:', err);
      setError(err.message);
      
      // Force navigation even on error
      await router.push('/success');
      resetState();
      return true;
    } finally {
      setLoading(false);
    }
  }, [order, itemsToReturn, setLoading, setError, resetState, router]);

  // Initialize selected items from order line items
  useEffect(() => {
    if (order && order.line_items) {
      const initialSelected = {};
      order.line_items.forEach(item => {
        // Make sure item.id is treated as a string key
        initialSelected[item.id.toString()] = 0;
      });
      setSelectedItems(initialSelected);
    }
  }, [order]);

  return {
    // State
    order,
    itemsToReturn,
    returnReasons,
    returnOptions,
    selectedItems,
    loading,
    error,
    
    // Methods
    lookupOrder,
    updateItemQuantity,
    selectItemsForReturn,
    setItemReturnReason,
    setItemReturnOption,
    completeReturn,
    resetState,
  };
}