// src/pages/return-review.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle, ArrowLeft, RefreshCw, Package, ArrowRight, ShieldCheck } from 'lucide-react';
import { useReturnFlow } from '@/hooks/useReturnFlow';
import ReturnLayout from '@/components/return/ReturnLayout';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/return/ProductCard';
import { motion } from 'framer-motion';

export default function ReturnReview() {
  const router = useRouter();
  const {
    order,
    itemsToReturn,
    loading,
    error,
    completeReturn
  } = useReturnFlow();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Redirect if no items to return
  useEffect(() => {
    if (!loading && (!order || !itemsToReturn.length)) {
      router.replace('/');
    }
  }, [order, itemsToReturn, loading, router]);

  // Handle back button
  const handleBack = () => {
    // If we have items, go back to the last item's options page
    if (itemsToReturn.length > 0) {
      const lastItemId = itemsToReturn[itemsToReturn.length - 1].id;
      router.push(`/return-options/${lastItemId}`);
    } else {
      router.push('/');
    }
  };

  // Handle submit button click
  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent multiple submissions
    if (!termsAccepted) {
      alert('Please accept the terms and conditions to continue');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const success = await completeReturn();
      if (success) {
        // Will be redirected to success page from the hook
      }
    } catch (err) {
      // Error handling is done in the hook
      console.error('Error completing return:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate order summary
  const getSummary = () => {
    const returnCount = itemsToReturn.filter(item => item.returnOption === 'return').length;
    const exchangeCount = itemsToReturn.filter(item => item.returnOption === 'exchange').length;
    
    return {
      returnCount,
      exchangeCount,
      totalCount: returnCount + exchangeCount
    };
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
  if (loading || !order || !itemsToReturn) {
    return (
      <ReturnLayout 
        currentStep={5} 
        title="Review Your Return"
        showBackButton={true}
        onBackClick={handleBack}
      >
        <div className="p-6 text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">Loading return details...</p>
          </div>
        </div>
      </ReturnLayout>
    );
  }

  const summary = getSummary();

  return (
    <ReturnLayout 
      currentStep={5} 
      title="Review Your Return"
      showBackButton={true}
      onBackClick={handleBack}
    >
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-medium text-gray-900">Review and Confirm</h2>
          <p className="text-sm text-gray-500 mt-1">
            Please review the details of your return before submitting
          </p>
        </div>
        
        {error && (
          <div className="p-4 mb-6 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 text-center">
            <p className="text-2xl font-bold text-blue-700">{summary.totalCount}</p>
            <p className="text-sm text-blue-700">Total Items</p>
          </div>
          
          {summary.returnCount > 0 && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 text-center">
              <p className="text-2xl font-bold text-amber-700">{summary.returnCount}</p>
              <p className="text-sm text-amber-700">Returns</p>
            </div>
          )}
          
          {summary.exchangeCount > 0 && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-100 text-center">
              <p className="text-2xl font-bold text-green-700">{summary.exchangeCount}</p>
              <p className="text-sm text-green-700">Exchanges</p>
            </div>
          )}
        </div>

        {/* Items list */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4 mb-6"
        >
          <h3 className="font-medium text-gray-900 flex items-center">
            <Package className="w-5 h-5 mr-2 text-blue-600" />
            Items to Process
          </h3>
          
          {itemsToReturn.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No items selected for return.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {itemsToReturn.map((item) => (
                <motion.div key={item.id} variants={itemVariants}>
                  <ProductCard
                    product={item}
                    showQuantitySelector={false}
                    returnOption={item.returnOption}
                    className="border border-gray-200"
                  />
                  
                  <div className="mt-2 pl-4 text-sm text-gray-600">
                    <p><span className="font-medium">Reason:</span> {item.returnReason?.reason || 'Not specified'}</p>
                    {item.returnReason?.additionalInfo && (
                      <p className="text-gray-500 italic">{item.returnReason.additionalInfo}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
        
        {/* Exchange details section */}
        {itemsToReturn.some(item => item.returnOption === 'exchange' && item.exchangeDetails) && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-6"
          >
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <RefreshCw className="w-5 h-5 mr-2 text-blue-600" />
              Exchange Details
            </h3>
            
            <div className="space-y-3">
              {itemsToReturn
                .filter(item => item.returnOption === 'exchange' && item.exchangeDetails)
                .map((item) => (
                  <motion.div key={`exchange-${item.id}`} variants={itemVariants} className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-white rounded-md flex-shrink-0 flex items-center justify-center mr-3">
                        <RefreshCw className="w-4 h-4 text-blue-500" />
                      </div>
                      
                      <div>
                        <p className="font-medium text-sm text-gray-900">{item.title || item.name}</p>
                        <div className="mt-2 text-xs text-gray-700 space-y-1">
                          {item.exchangeDetails?.originalSize !== item.exchangeDetails?.newSize && (
                            <div className="flex items-center">
                              <span className="w-16 inline-block font-medium">Size:</span> 
                              <span className="line-through mr-2">{item.exchangeDetails?.originalSize || 'N/A'}</span>
                              <ArrowRight className="w-3 h-3 mx-1" />
                              <span className="font-medium text-blue-700">{item.exchangeDetails?.newSize || 'N/A'}</span>
                            </div>
                          )}
                          
                          {item.exchangeDetails?.originalColor !== item.exchangeDetails?.newColor && (
                            <div className="flex items-center">
                              <span className="w-16 inline-block font-medium">Color:</span> 
                              <span className="line-through mr-2">{item.exchangeDetails?.originalColor || 'N/A'}</span>
                              <ArrowRight className="w-3 h-3 mx-1" />
                              <span className="font-medium text-blue-700">{item.exchangeDetails?.newColor || 'N/A'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </motion.div>
        )}
        
        {/* Return policy acceptance */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="font-medium text-gray-700">I accept the return policy</label>
              <p className="text-gray-500">
                By submitting this return, I confirm that all items are in the condition described
                in the return policy. I understand that returns are subject to inspection before refund.
              </p>
            </div>
          </div>
        </div>
        
        {/* Return instructions */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start">
            <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900">What happens next?</h4>
              <p className="mt-1 text-sm text-blue-700">
                After submitting your return request, you'll receive an email with a return shipping label. Pack your items and attach the label to ship them back to us.
              </p>
            </div>
          </div>
        </div>
        
        {/* Submit button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={loading || isSubmitting || itemsToReturn.length === 0 || !termsAccepted}
            isLoading={loading || isSubmitting}
            variant="primary"
            size="lg"
            icon={<CheckCircle className="w-5 h-5" />}
          >
            {isSubmitting ? 'Processing...' : 'Complete Return'}
          </Button>
        </div>
      </div>
    </ReturnLayout>
  );
}