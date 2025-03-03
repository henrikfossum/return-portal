// src/pages/order-details.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { ShoppingBag } from 'lucide-react';
import { useReturnFlow } from '@/hooks/useReturnFlow';
import { useTenantSettings } from '@/lib/tenant/hooks';
import Layout from '@/components/ui/Layout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/return/ProductCard';

export default function OrderDetails() {
  const router = useRouter();
  const { 
    order, 
    selectedItems, 
    updateItemQuantity, 
    selectItemsForReturn,
    loading,
    error
  } = useReturnFlow();
  
  const { settings } = useTenantSettings();

  // If no order, redirect back to start
  useEffect(() => {
    if (!order && !loading) {
      router.replace('/');
    }
  }, [order, loading, router]);

  // Handle continue button click
  const handleContinue = () => {
    if (selectItemsForReturn()) {
      // Navigate to the return reason page for first item
      const selectedItemIds = Object.entries(selectedItems)
        .filter(([_, qty]) => qty > 0)
        .map(([id]) => id);
        
      if (selectedItemIds.length > 0) {
        router.push(`/return-reason/${selectedItemIds[0]}`);
      }
    }
  };

  // Calculate total selected items
  const totalItemsSelected = Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0);

  if (!order) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Loading order details...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4">
      <Card 
        title="Products Available for Return"
        padding="normal"
        elevation="low"
        className="relative mb-20" // Make Card relative so that absolute elements are positioned relative to it
        >
        {error && (
            <div className="p-4 mb-4 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
            </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {order.line_items.map((item) => (
            <ProductCard
                key={item.id}
                product={item}
                isSelected={selectedItems[item.id] > 0}
                quantity={selectedItems[item.id] || 0}
                maxQuantity={item.quantity}
                onQuantityChange={updateItemQuantity}
            />
            ))}
        </div>
        
        {order.line_items.length === 0 && (
            <div className="text-center py-8">
            <p className="text-gray-500">No items available for return.</p>
            </div>
        )}

        {/* Nav bar positioned absolutely inside the Card */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-gray-600" />
                <span className="text-sm sm:text-base text-gray-600">
                {totalItemsSelected} {totalItemsSelected === 1 ? 'item' : 'items'} selected
                </span>
            </div>
            
            <Button
                onClick={handleContinue}
                disabled={totalItemsSelected === 0}
                variant="primary"
                icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                }
                iconPosition="right"
            >
                Continue
            </Button>
            </div>
        </div>
        </Card>        
      </div>
    </Layout>
  );
}