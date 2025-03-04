// src/pages/return-review.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle, ArrowLeft, RefreshCw, Package, ArrowRight } from 'lucide-react';
import { useReturnFlow } from '@/hooks/useReturnFlow';
import Layout from '@/components/ui/Layout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/return/ProductCard';

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

  // Loading state
  if (loading || !order || !itemsToReturn) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading return details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const summary = getSummary();

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4">
        {/* Back button */}
        <button 
          onClick={handleBack}
          className="flex items-center text-gray-600 mb-4 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </button>
        
        <Card
          title="Review Your Return/Exchange"
          subtitle="Please review the items below before completing your request."
          padding="normal"
          elevation="low"
        >
          {/* Error message */}
          {error && (
            <div className="p-4 mb-4 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.totalCount}</p>
            </div>
            
            {summary.returnCount > 0 && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <p className="text-sm text-gray-600">Returns</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.returnCount}</p>
              </div>
            )}
            
            {summary.exchangeCount > 0 && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <p className="text-sm text-gray-600">Exchanges</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.exchangeCount}</p>
              </div>
            )}
          </div>

          {/* Items list */}
          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Items to Process</h3>
            
            {itemsToReturn.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No items selected for return.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {itemsToReturn.map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    showQuantitySelector={false}
                    returnOption={item.returnOption}
                    className="bg-gray-50"
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Exchange details section */}
          {itemsToReturn.some(item => item.returnOption === 'exchange' && item.exchangeDetails) && (
            <div className="mb-6 border-t border-gray-200 pt-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <RefreshCw className="w-4 h-4 mr-2 text-blue-600" />
                Exchange Details
              </h3>
              
              {itemsToReturn
                .filter(item => item.returnOption === 'exchange' && item.exchangeDetails)
                .map((item) => (
                  <div key={`exchange-${item.id}`} className="bg-blue-50 rounded-lg p-4 mb-3 border border-blue-100">
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-white rounded-md flex-shrink-0 flex items-center justify-center mr-3">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            className="w-8 h-8 object-contain" 
                          />
                        ) : (
                          <Package className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      
                      <div>
                        <p className="font-medium text-sm text-gray-900">{item.title}</p>
                        <div className="mt-2 text-xs text-gray-700 space-y-1">
                          {item.exchangeDetails?.originalSize !== item.exchangeDetails?.newSize && (
                            <p className="flex items-center">
                              <span className="w-16 inline-block">Size:</span> 
                              <span className="line-through mr-2">{item.exchangeDetails?.originalSize || 'N/A'}</span>
                              <ArrowRight className="w-3 h-3 mx-1" />
                              <span className="font-medium">{item.exchangeDetails?.newSize || 'N/A'}</span>
                            </p>
                          )}
                          
                          {item.exchangeDetails?.originalColor !== item.exchangeDetails?.newColor && (
                            <p className="flex items-center">
                              <span className="w-16 inline-block">Color:</span> 
                              <span className="line-through mr-2">{item.exchangeDetails?.originalColor || 'N/A'}</span>
                              <ArrowRight className="w-3 h-3 mx-1" />
                              <span className="font-medium">{item.exchangeDetails?.newColor || 'N/A'}</span>
                            </p>
                          )}
                          
                          {item.exchangeDetails?.originalSize === item.exchangeDetails?.newSize && 
                           item.exchangeDetails?.originalColor === item.exchangeDetails?.newColor && (
                            <p className="italic">Same size and color as original item</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
          
          {/* Submit button */}
          <div className="mt-6">
            <Button
              onClick={handleSubmit}
              disabled={loading || isSubmitting || itemsToReturn.length === 0}
              isLoading={loading || isSubmitting}
              variant="primary"
              fullWidth
              size="lg"
              icon={<CheckCircle className="w-5 h-5" />}
            >
              {isSubmitting ? 'Processing...' : 'Complete Return/Exchange'}
            </Button>
            
            <p className="text-xs text-gray-500 mt-4 text-center">
              By completing this return request, you agree to the return policy. 
              Once submitted, you will receive an email with further instructions.
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}