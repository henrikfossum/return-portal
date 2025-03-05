// src/pages/order-details.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { ShoppingBag, AlertCircle, ArrowRight } from 'lucide-react';
import { useReturnFlow } from '@/hooks/useReturnFlow';
import { useTenantSettings } from '@/lib/tenant/hooks';
import ReturnLayout from '@/components/return/ReturnLayout';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/return/ProductCard';
import { motion } from 'framer-motion';

export default function OrderDetails() {
  const router = useRouter();
  const { 
    order, 
    selectedItems, 
    updateItemQuantity, 
    selectItemsForReturn,
    loading,
    error,
    resetState
  } = useReturnFlow();
  
  const { settings } = useTenantSettings();

  // If no order, redirect back to start
  useEffect(() => {
    if (!order && !loading) {
      router.replace('/');
    }
  }, [order, loading, router]);

  const handleBack = () => {
    resetState();
    router.replace('/');
  };

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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (!order) {
    return (
      <ReturnLayout 
        currentStep={2} 
        title="Select Items to Return"
        showBackButton={true}
        onBackClick={handleBack}
      >
        <div className="p-6 text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">Loading your order details...</p>
          </div>
        </div>
      </ReturnLayout>
    );
  }

  return (
    <ReturnLayout 
      currentStep={2} 
      title="Select Items to Return"
      showBackButton={true}
      onBackClick={handleBack}
    >
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-medium text-gray-900">Select Items to Return</h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose the items you'd like to return or exchange from your order #{order.order_number || order.id}
          </p>
        </div>
        
        {error && (
          <div className="p-4 mb-6 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5 mr-2" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}
        
        {order.line_items.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 text-center">
            <p className="text-yellow-700">No eligible items found for return in this order.</p>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={handleBack}
            >
              Return to Home
            </Button>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4 mb-20"
          >
            {order.line_items.map((item) => (
              <motion.div key={item.id} variants={itemVariants}>
                <ProductCard
                  product={item}
                  isSelected={selectedItems[item.id] > 0}
                  quantity={selectedItems[item.id] || 0}
                  maxQuantity={item.quantity}
                  onQuantityChange={updateItemQuantity}
                  onSelect={() => {
                    // If not selected, set quantity to 1, otherwise set to 0
                    updateItemQuantity(item.id, selectedItems[item.id] > 0 ? 0 : 1);
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
      
      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg rounded-b-lg">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-700">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-sm sm:text-base text-gray-700">
              {totalItemsSelected} {totalItemsSelected === 1 ? 'item' : 'items'} selected
            </span>
          </div>
          
          <Button
            onClick={handleContinue}
            disabled={totalItemsSelected === 0}
            variant="primary"
            size="lg"
            icon={<ArrowRight className="w-5 h-5" />}
            iconPosition="right"
          >
            Continue
          </Button>
        </div>
      </div>
    </ReturnLayout>
  );
}