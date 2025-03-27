// src/pages/return-reason/[id].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { HelpCircle } from 'lucide-react';
import { useReturnFlow } from '@/hooks/useReturnFlow';
import { useTenantSettings } from '@/lib/tenant/hooks';
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
    'Doesn&apos;t fit',
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
        title="Return Reason"
        showBackButton={true}
        onBackClick={handleBack}
      >
        <div className="p-6 text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">Loading item details...</p>
          </div>
        </div>
      </ReturnLayout>
    );
  }

  return (
    <ReturnLayout 
      currentStep={3} 
      title="Return Reason"
      showBackButton={true}
      onBackClick={handleBack}
    >
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-medium text-gray-900">Why Are You Returning This Item?</h2>
          <p className="text-sm text-gray-500 mt-1">
            Please tell us the reason you're returning this item
          </p>
        </div>
        
        {/* Product preview */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
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
          <h3 className="font-medium text-gray-900 flex items-center">
            <HelpCircle className="w-5 h-5 mr-2 text-blue-600" />
            Select a reason:
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
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="return-reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-gray-900 font-medium">{reason}</span>
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
            <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 mb-2">
              Additional details (optional)
            </label>
            <textarea
              id="additionalInfo"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Please provide any additional details about your return..."
            ></textarea>
          </motion.div>
        )}
        
        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={!selectedReason}
            variant="primary"
            size="lg"
          >
            Continue
          </Button>
        </div>
      </div>
    </ReturnLayout>
  );
}