// src/pages/order-details.js - With improved error handling and translations
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ShoppingBag, AlertCircle, ArrowRight, Info, Phone, Mail } from 'lucide-react';
import { useReturnFlow } from '@/hooks/useReturnFlow';
import { useTenantSettings } from '@/lib/tenant/hooks';
import { useLocale } from '@/lib/i18n';
import Trans from '@/lib/i18n/Trans';
import ReturnLayout from '@/components/return/ReturnLayout';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/return/ProductCard';
import ReturnPolicyInfo from '@/components/return/ReturnPolicyInfo';
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
  const { t } = useLocale();
  const [localError, setLocalError] = useState('');

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
    // Clear any previous error
    setLocalError('');
    
    // Validate selection
    const selectedItemIds = Object.entries(selectedItems)
      .filter(([, qty]) => qty > 0)
      .map(([id]) => id);
  
      
    if (selectedItemIds.length === 0) {
      setLocalError(t('return.orderDetails.noItemsSelected', 'Please select at least one item to continue'));
      return;
    }
    
    // Use the original function that worked
    if (selectItemsForReturn()) {
      // Navigate to the return reason page for the first item
      router.push(`/return-reason/${selectedItemIds[0]}`);
    }
  };

  // Calculate total selected items
  const totalItemsSelected = Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0);

  // Filter eligible items if we have eligibility info
  const eligibleItems = order?.eligible_items || 
                        order?.line_items?.filter(item => item.isEligibleForReturn !== false) ||
                        order?.line_items || [];
                        
  const ineligibleItems = order?.ineligible_items || 
                          order?.line_items?.filter(item => item.isEligibleForReturn === false) || 
                          [];
  
  // Group ineligible items by reason
  const ineligibleReasons = {};
  ineligibleItems.forEach(item => {
    const reason = item.ineligibleReason || t('return.orderDetails.defaultIneligibleReason', 'Not eligible for return');
    if (!ineligibleReasons[reason]) {
      ineligibleReasons[reason] = [];
    }
    ineligibleReasons[reason].push(item);
  });
  
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
        title={t('return.orderDetails.title', 'Select Items to Return')}
        showBackButton={true}
        onBackClick={handleBack}
      >
        <div className="p-6 text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">
              <Trans i18nKey="common.loading">Loading your order details...</Trans>
            </p>
          </div>
        </div>
      </ReturnLayout>
    );
  }

  return (
    <ReturnLayout 
      currentStep={2} 
      title={t('return.orderDetails.title', 'Select Items to Return')}
      showBackButton={true}
      onBackClick={handleBack}
    >
      <div className="p-6 return-portal-container">
        {/* Order Summary */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <div>
              <h2 className="text-xl font-medium return-portal-heading">
                <Trans i18nKey="return.orderDetails.orderNumber" params={{orderNumber: order.order_number || order.id}}>
                  Order #{order.order_number || order.id}
                </Trans>
              </h2>
              <p className="text-sm text-gray-500 mt-1 return-portal-text-secondary">
                <Trans i18nKey="return.orderDetails.placedOn" params={{date: new Date(order.created_at).toLocaleDateString()}}>
                  Placed on {new Date(order.created_at).toLocaleDateString()}
                </Trans>
              </p>
            </div>
            
            {order.order_status_url && (
              <a 
                href={order.order_status_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 sm:mt-0 text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                style={{ color: 'var(--theme-primary-color, #4f46e5)' }}
              >
                <Info className="w-4 h-4 mr-1" />
                <Trans i18nKey="return.orderDetails.viewOriginal">View Original Order</Trans>
              </a>
            )}
          </div>
          
          {/* Return Policy Information */}
          <ReturnPolicyInfo 
            settings={settings}
            order={order}
            eligibleItems={eligibleItems}
            ineligibleItems={ineligibleItems}
            className="mb-6"
          />
          
          <p className="text-sm text-gray-700 mt-4 return-portal-text">
            <Trans i18nKey="return.orderDetails.chooseItems">
              Choose the items you&apos;d like to return or exchange. Only eligible items can be selected.
            </Trans>
          </p>
        </div>
        
        {/* Show backend or local validation error */}
        {(error || localError) && (
          <div className="p-4 mb-6 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5 mr-2" />
              <p className="text-sm text-red-600">{error || localError}</p>
            </div>
          </div>
        )}
        
        {/* Show message if no eligible items */}
        {eligibleItems.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
            <div className="flex flex-col items-center text-center mb-4 py-3">
              <AlertCircle className="h-14 w-14 text-yellow-500 mb-3" />
              <h3 className="text-xl font-medium text-yellow-800 mb-2">
                <Trans i18nKey="return.orderDetails.noEligibleItems">No Eligible Items</Trans>
              </h3>
              <p className="text-yellow-700 max-w-md">
                <Trans i18nKey="return.orderDetails.noEligibleItemsMessage">
                  We couldn&apos;t find any eligible items for return in this order.
                </Trans>
              </p>
            </div>
            
            {/* Ineligible items with reasons */}
            {ineligibleItems.length > 0 && (
              <div className="mt-4 bg-white rounded-lg p-4 border border-yellow-200">
                <h4 className="font-medium text-gray-800 mb-3">
                  <Trans i18nKey="return.orderDetails.ineligibleReasonsTitle">
                    Why items are not eligible:
                  </Trans>
                </h4>
                
                {/* Group by reason for better organization */}
                {Object.entries(ineligibleReasons).map(([reason, items]) => (
                  <div key={reason} className="mb-4 last:mb-0">
                    <div className="flex items-start mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                      <h5 className="font-medium text-yellow-800">{reason}</h5>
                    </div>
                    
                    <ul className="pl-6 space-y-1">
                      {items.map(item => (
                        <li key={item.id} className="text-sm text-gray-700">
                          {item.title || item.name}
                          {item.variant_title && (
                            <span className="text-gray-500"> ({item.variant_title})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            
            {/* Help information */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                <Info className="w-4 h-4 mr-2" />
                <Trans i18nKey="return.orderDetails.needHelp">Need Help?</Trans>
              </h4>
              <p className="text-sm text-blue-700 mb-3">
                <Trans i18nKey="return.orderDetails.helpMessage">
                  If you believe your items should be eligible for return or have questions about our return policy,
                  please contact our customer support team:
                </Trans>
              </p>
              <div className="flex flex-col space-y-2">
                <a href="mailto:support@example.com" className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                   style={{ color: 'var(--theme-primary-color, #4f46e5)' }}>
                  <Mail className="w-4 h-4 mr-2" /> support@example.com
                </a>
                <a href="tel:+18001234567" className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                   style={{ color: 'var(--theme-primary-color, #4f46e5)' }}>
                  <Phone className="w-4 h-4 mr-2" /> 1-800-123-4567
                </a>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <Button
                variant="primary"
                size="md"
                onClick={handleBack}
                className="return-portal-button-primary"
              >
                <Trans i18nKey="return.success.returnHome">Return to Home</Trans>
              </Button>
            </div>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4 mb-20"
          >
            {eligibleItems.map((item) => (
              <motion.div key={item.id} variants={itemVariants}>
                <ProductCard
                  product={{
                    ...item,
                    // Ensure image is available in the expected format for the component
                    imageUrl: item.imageUrl || item.variant_image || item.product_image || item.image?.src,
                    variant_image: item.variant_image || item.imageUrl || item.product_image || item.image?.src,
                    product_image: item.product_image || item.imageUrl || item.variant_image || item.image?.src
                  }}
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
      
      {/* Fixed bottom action bar - only show if there are eligible items */}
      {eligibleItems.length > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg rounded-b-lg z-10"
             style={{ 
               backgroundColor: 'var(--theme-card-background, #ffffff)',
               borderColor: 'var(--theme-border-color, #e5e7eb)'
             }}>
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-700"
                   style={{ 
                     backgroundColor: 'rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.1)',
                     color: 'var(--theme-primary-color, #4f46e5)' 
                   }}>
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-sm sm:text-base text-gray-700 return-portal-text">
                <Trans 
                  i18nKey="return.orderDetails.itemsSelected" 
                  params={{count: totalItemsSelected}}
                >
                  {totalItemsSelected} {totalItemsSelected === 1 ? 'item' : 'items'} selected
                </Trans>
              </span>
            </div>
            
            <Button
              onClick={handleContinue}
              disabled={totalItemsSelected === 0}
              variant="primary"
              size="lg"
              icon={<ArrowRight className="w-5 h-5" />}
              iconPosition="right"
              className="return-portal-button-primary"
            >
              <Trans i18nKey="common.continue">Continue</Trans>
            </Button>
          </div>
        </div>
      )}
    </ReturnLayout>
  );
}