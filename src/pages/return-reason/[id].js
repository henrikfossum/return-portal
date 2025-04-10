// src/pages/return-reason/[id].js - With proper translation and theme implementation
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { HelpCircle } from 'lucide-react';
import { useReturnFlow } from '@/hooks/useReturnFlow';
import { useTenantSettings } from '@/lib/tenant/hooks';
import { useLocale } from '@/lib/i18n';
import Trans from '@/lib/i18n/Trans';
import ReturnLayout from '@/components/return/ReturnLayout';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/return/ProductCard';
import { motion } from 'framer-motion';

export default function ReturnReason() {
  const router = useRouter();
  const { id } = router.query;
  const { 
    order, 
    itemsToReturn, 
    setItemReturnReason
  } = useReturnFlow();
  const { settings } = useTenantSettings();
  const { t } = useLocale();
  
  const [selectedReason, setSelectedReason] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  
  // Find the current item
  const currentItem = id 
    ? itemsToReturn.find(item => item.id.toString() === id.toString()) || 
      (order?.line_items || []).find(item => item.id.toString() === id.toString())
    : null;

  // Redirect if no item found or no order
  useEffect(() => {
    if (router.isReady && (!order || !currentItem)) {
      router.replace('/');
    }
  }, [router, order, currentItem]);
  

  // Handle back button
  const handleBack = () => {
    router.push('/order-details');
  };

  // Handle continue button
  const handleContinue = () => {
    if (!selectedReason) return;
    const reasonData = {
      reason: selectedReason,
      additionalInfo: additionalInfo.trim()
    };
    setItemReturnReason(id, reasonData);
    // The navigation to the next page is handled in the hook
  };

  // Get the return reasons from settings
  const defaultReasons = [
    'Doesn\'t fit',
    'Changed my mind',
    'Product damaged',
    'Incorrect item received',
    'Quality not as expected',
    'Other'
  ];
  
  // Use tenant settings if available, otherwise use defaults
  const returnReasons = settings?.returnReasons || defaultReasons;

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
        currentStep={3} 
        title={t('return.returnReason.title', 'Return Reason')}
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
      currentStep={3} 
      title={t('return.returnReason.title', 'Return Reason')}
      showBackButton={true}
      onBackClick={handleBack}
    >
      <div className="p-6 return-portal-container">
        <div className="mb-6">
          <h2 className="text-xl font-medium return-portal-heading">
            <Trans i18nKey="return.returnReason.title">Why Are You Returning This Item?</Trans>
          </h2>
          <p className="text-sm mt-1 return-portal-text-secondary">
            <Trans i18nKey="return.returnReason.subtitle">
              Please tell us the reason you're returning this item
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

        {/* Reason selection */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4 mb-6"
        >
          <h3 className="font-medium flex items-center return-portal-heading">
            <HelpCircle className="w-5 h-5 mr-2" style={{color: 'var(--theme-primary-color, #4f46e5)'}} />
            <Trans i18nKey="return.returnReason.selectReason">Select a reason:</Trans>
          </h3>
          
          <div className="grid gap-3">
            {returnReasons.map((reason) => (
              <motion.div key={reason} variants={itemVariants}>
                <label 
                  className={`
                    block p-4 border rounded-lg cursor-pointer transition
                    ${selectedReason === reason
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'}
                  `}
                  style={{
                    borderColor: selectedReason === reason 
                      ? 'var(--theme-primary-color, #4f46e5)' 
                      : 'var(--theme-border-color, #e5e7eb)',
                    backgroundColor: selectedReason === reason 
                      ? 'rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.05)' 
                      : 'var(--theme-card-background, #ffffff)',
                    boxShadow: selectedReason === reason 
                      ? `0 0 0 2px rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.2)` 
                      : 'none'
                  }}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="return-reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="h-4 w-4 focus:ring-blue-500"
                      style={{
                        accentColor: 'var(--theme-primary-color, #4f46e5)',
                        borderColor: 'var(--theme-border-color, #e5e7eb)'
                      }}
                    />
                    <span className="ml-3 font-medium return-portal-text">
                      {reason}
                    </span>
                  </div>
                </label>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Additional details field */}
        {selectedReason && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <label htmlFor="additionalInfo" className="block text-sm font-medium mb-2 return-portal-text">
              <Trans i18nKey="return.returnReason.additionalInfo">Additional details (optional)</Trans>
            </label>
            <textarea
              id="additionalInfo"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              style={{
                borderColor: 'var(--theme-border-color, #e5e7eb)',
                color: 'var(--theme-text-color, #171717)'
              }}
              placeholder={t('return.returnReason.additionalInfoPlaceholder', 'Please provide any additional details about your return...')}
            ></textarea>
          </motion.div>
        )}
        
        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={!selectedReason}
            variant="primary"
            size="lg"
            className="return-portal-button-primary"
          >
            <Trans i18nKey="common.continue">Continue</Trans>
          </Button>
        </div>
      </div>
    </ReturnLayout>
  );
}