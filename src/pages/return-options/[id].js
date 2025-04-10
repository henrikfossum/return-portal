// src/pages/return-options/[id].js - With proper translation and theme implementation
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowRight } from 'lucide-react';
import { useReturnFlow } from '@/hooks/useReturnFlow';
import { useTenantSettings } from '@/lib/tenant/hooks';
import { useLocale } from '@/lib/i18n';
import Trans from '@/lib/i18n/Trans';
import ReturnLayout from '@/components/return/ReturnLayout';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/return/ProductCard';
import ExchangeOptions from '@/components/return/ExchangeOptions';
import { motion } from 'framer-motion';

export default function ReturnOptions() {
  const router = useRouter();
  const { id } = router.query;
  const { 
    order, 
    itemsToReturn, 
    setItemReturnOption, 
    loading 
  } = useReturnFlow();
  const { settings } = useTenantSettings();
  const { t } = useLocale();
  
  const [selectedOption, setSelectedOption] = useState('');
  const [exchangeDetails, setExchangeDetails] = useState(null);
  
  // Find the current item
  const currentItem = id 
    ? itemsToReturn.find(item => item.id.toString() === id.toString()) || 
      (order?.line_items || []).find(item => item.id.toString() === id.toString())
    : null;

  // Check if exchanges are allowed from settings
  const allowExchanges = settings?.allowExchanges !== false;

  // Redirect if no item found or no order
  useEffect(() => {
    if (!loading && router.isReady && (!order || !currentItem)) {
      router.replace('/');
    }
  }, [order, currentItem, router, loading]);  

  // Handle back button
  const handleBack = () => {
    router.push(`/return-reason/${id}`);
  };

  // Handle continue button
  const handleContinue = () => {
    if (!selectedOption) return;
    
    // For exchange, add an additional check to prevent selecting the current size
    if (selectedOption === 'exchange') {
      if (!exchangeDetails) {
        alert(t('return.returnOptions.selectExchangeOptions', 'Please select exchange options'));
        return;
      }
      
      // Prevent continuing if no actual change was made
      if (exchangeDetails.originalSize === exchangeDetails.newSize) {
        alert(t('return.returnOptions.differentSizeRequired', 'Please select a different size for exchange'));
        return;
      }
    }
    
    setItemReturnOption(id, selectedOption, exchangeDetails);
    // Navigation to the next item or review page is handled in the hook
  };

  // Handle exchange details update from the ExchangeOptions component
  const handleExchangeDetailsChange = (details) => {
    setExchangeDetails(details);
  };

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

  // Loading state
  if (!order || !currentItem) {
    return (
      <ReturnLayout 
        currentStep={4} 
        title={t('return.returnOptions.title', 'Return Options')}
        showBackButton={true}
        onBackClick={handleBack}
      >
        <div className="p-6 text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"
                 style={{ borderColor: 'var(--theme-primary-color, #4f46e5)' }}></div>
            <p className="text-gray-500 return-portal-text-secondary">
              <Trans i18nKey="common.loading">Loading item details...</Trans>
            </p>
          </div>
        </div>
      </ReturnLayout>
    );
  }

  return (
    <ReturnLayout 
      currentStep={4} 
      title={t('return.returnOptions.title', 'Return Options')}
      showBackButton={true}
      onBackClick={handleBack}
    >
      <div className="p-6 return-portal-container">
        <div className="mb-6">
          <h2 className="text-xl font-medium return-portal-heading">
            <Trans i18nKey="return.returnOptions.subtitle">Choose Return or Exchange</Trans>
          </h2>
          <p className="text-sm mt-1 return-portal-text-secondary">
            <Trans i18nKey="return.returnOptions.chooseOption">
              Would you prefer a refund or an exchange for this item?
            </Trans>
          </p>
        </div>
        
        {/* Product preview */}
        <div className="mb-6 p-4 rounded-lg border"
             style={{
               backgroundColor: 'var(--theme-background-color, #f9fafb)',
               borderColor: 'var(--theme-border-color, #e5e7eb)'
             }}>
          <ProductCard
            product={currentItem}
            showQuantitySelector={false}
          />
        </div>

        {/* Option selection */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4 mb-6"
        >
          <h3 className="font-medium return-portal-heading">
            <Trans i18nKey="return.returnOptions.selectOption">Select an option:</Trans>
          </h3>
          
          <div className="grid gap-3">
            {/* Return option */}
            <motion.div variants={itemVariants}>
              <label 
                className={`
                  block p-4 border rounded-lg cursor-pointer transition
                  ${selectedOption === 'return'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'}
                `}
                style={{
                  borderColor: selectedOption === 'return' 
                    ? 'var(--theme-primary-color, #4f46e5)' 
                    : 'var(--theme-border-color, #e5e7eb)',
                  backgroundColor: selectedOption === 'return' 
                    ? 'rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.05)' 
                    : 'var(--theme-card-background, #ffffff)',
                  boxShadow: selectedOption === 'return' 
                    ? `0 0 0 2px rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.2)` 
                    : 'none'
                }}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="return-option"
                    value="return"
                    checked={selectedOption === 'return'}
                    onChange={() => setSelectedOption('return')}
                    className="h-4 w-4 focus:ring-blue-500"
                    style={{
                      accentColor: 'var(--theme-primary-color, #4f46e5)',
                      borderColor: 'var(--theme-border-color, #e5e7eb)'
                    }}
                  />
                  <div className="ml-3">
                    <span className="font-medium block return-portal-text">
                      <Trans i18nKey="return.returnOptions.returnOption">Return for refund</Trans>
                    </span>
                    <span className="text-sm return-portal-text-secondary">
                      <Trans i18nKey="return.returnOptions.returnDescription">
                        Refund will be processed to your original payment method
                      </Trans>
                    </span>
                  </div>
                </div>
              </label>
            </motion.div>
            
            {/* Exchange option, only show if allowed */}
            {allowExchanges && (
              <motion.div variants={itemVariants}>
                <label 
                  className={`
                    block p-4 border rounded-lg cursor-pointer transition
                    ${selectedOption === 'exchange'
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'}
                  `}
                  style={{
                    borderColor: selectedOption === 'exchange' 
                      ? 'var(--theme-primary-color, #4f46e5)' 
                      : 'var(--theme-border-color, #e5e7eb)',
                    backgroundColor: selectedOption === 'exchange' 
                      ? 'rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.05)' 
                      : 'var(--theme-card-background, #ffffff)',
                    boxShadow: selectedOption === 'exchange' 
                      ? `0 0 0 2px rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.2)` 
                      : 'none'
                  }}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="return-option"
                      value="exchange"
                      checked={selectedOption === 'exchange'}
                      onChange={() => setSelectedOption('exchange')}
                      className="h-4 w-4 focus:ring-blue-500"
                      style={{
                        accentColor: 'var(--theme-primary-color, #4f46e5)',
                        borderColor: 'var(--theme-border-color, #e5e7eb)'
                      }}
                    />
                    <div className="ml-3">
                      <span className="font-medium block return-portal-text">
                        <Trans i18nKey="return.returnOptions.exchangeOption">
                          Exchange for another size/color
                        </Trans>
                      </span>
                      <span className="text-sm return-portal-text-secondary">
                        <Trans i18nKey="return.returnOptions.exchangeDescription">
                          We'll ship a replacement product to you
                        </Trans>
                      </span>
                    </div>
                  </div>
                </label>
              </motion.div>
            )}
          </div>
        </motion.div>
        
        {/* Exchange options - only show when exchange is selected */}
        {selectedOption === 'exchange' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <ExchangeOptions 
              product={currentItem} 
              onExchangeDetailsChange={handleExchangeDetailsChange}
            />
          </motion.div>
        )}
        
        {/* Continue button */}
        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={!selectedOption || (selectedOption === 'exchange' && !exchangeDetails)}
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
    </ReturnLayout>
  );
}