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
    currentStep,
    loading,
    error,
    setOrder,
    selectItems,
    setReturnReason,
    setReturnOption,
    setLoading,
    setError,
    setCurrentStep,
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
      .filter(([_, qty]) => qty > 0)
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
        returnOption: item.returnOption,
        exchangeDetails: item.exchangeDetails,
        quantity: item.quantity
      }));
      
      const response = await fetch('/api/returns/batch-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: enhancedItems }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Reset state and redirect to success page
        resetState();
        router.push('/success');
        return true;
      } else if (response.status === 207) {
        // Handle partial success
        setError('Some items could not be processed. Please check the details and try again.');
        return false;
      } else {
        setError(result.message || 'An error occurred while processing your return.');
        return false;
      }
    } catch (err) {
      setError(err.message || 'An error occurred while processing your return.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [order, itemsToReturn, setLoading, setError, resetState, router]);

  // Initialize selected items from order line items
  useEffect(() => {
    if (order) {
      const initialSelected = {};
      order.line_items.forEach(item => {
        initialSelected[item.id] = 0;
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
    currentStep,
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