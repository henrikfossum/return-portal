// src/pages/return-reason/[id].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft } from 'lucide-react';
import { useReturnFlow } from '@/hooks/useReturnFlow';
import { useTenantSettings } from '@/lib/tenant/hooks';
import Layout from '@/components/ui/Layout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/return/ProductCard';

export default function ReturnReason() {
  const router = useRouter();
  const { id } = router.query;
  const { order, itemsToReturn, setItemReturnReason, loading } = useReturnFlow();
  const { settings } = useTenantSettings();
  const [selectedReason, setSelectedReason] = useState('');
  
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
  }, [order, currentItem, router.isReady]);

  // Handle back button
  const handleBack = () => {
    router.push('/order-details');
  };

  // Handle continue button
  const handleContinue = () => {
    if (!selectedReason) return;
    setItemReturnReason(id, selectedReason);
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

  // Loading state
  if (!order || !currentItem) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

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
          title="Return Reason"
          subtitle="Please tell us why you're returning this item"
          padding="normal"
          elevation="low"
        >
          {/* Product card */}
          <div className="my-6">
            <ProductCard
              product={currentItem}
              showQuantitySelector={false}
            />
          </div>

          {/* Reason selection */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Select a reason:</h3>
            
            <div className="space-y-2">
              {returnReasons.map((reason) => (
                <label 
                  key={reason}
                  className={`
                    block p-4 border rounded-lg cursor-pointer transition
                    ${selectedReason === reason
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="return-reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="mr-3 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-gray-900">{reason}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          {/* Continue button */}
          <div className="mt-6">
            <Button
              onClick={handleContinue}
              disabled={!selectedReason}
              variant="primary"
              fullWidth
              size="lg"
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
        </Card>
      </div>
    </Layout>
  );
}