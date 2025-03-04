// src/pages/return-options/[id].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, RefreshCw, Package } from 'lucide-react';
import { useReturnFlow } from '@/hooks/useReturnFlow';
import { useTenantSettings } from '@/lib/tenant/hooks';
import Layout from '@/components/ui/Layout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/return/ProductCard';
import ExchangeOptions from '@/components/return/ExchangeOptions';

export default function ReturnOptions() {
  const router = useRouter();
  const { id } = router.query;
  const { order, itemsToReturn, setItemReturnOption, loading } = useReturnFlow();
  const { settings } = useTenantSettings();
  
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
  }, [order, currentItem, router.isReady, loading]);

  // Handle back button
  const handleBack = () => {
    router.push(`/return-reason/${id}`);
  };

  // Handle continue button
  const handleContinue = () => {
    if (!selectedOption) return;
    
    // For exchange, make sure we have some details
    if (selectedOption === 'exchange' && !exchangeDetails) {
      alert('Please select exchange options');
      return;
    }
    
    setItemReturnOption(id, selectedOption, exchangeDetails);
    // Navigation to the next item or review page is handled in the hook
  };

  // Handle exchange details update from the ExchangeOptions component
  const handleExchangeDetailsChange = (details) => {
    setExchangeDetails(details);
  };

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
          title="Select Return Option"
          subtitle="Would you prefer a return or exchange?"
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

          {/* Option selection */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Choose an option:</h3>
            
            <div className="space-y-3">
              {/* Return option */}
              <label 
                className={`
                  block p-4 border rounded-lg cursor-pointer transition
                  ${selectedOption === 'return'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="return-option"
                    value="return"
                    checked={selectedOption === 'return'}
                    onChange={() => setSelectedOption('return')}
                    className="mr-3 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-gray-900 font-medium block">Return for refund</span>
                    <span className="text-gray-500 text-sm">Refund will be processed to your original payment method</span>
                  </div>
                </div>
              </label>
              
              {/* Exchange option, only show if allowed */}
              {allowExchanges && (
                <label 
                  className={`
                    block p-4 border rounded-lg cursor-pointer transition
                    ${selectedOption === 'exchange'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="return-option"
                      value="exchange"
                      checked={selectedOption === 'exchange'}
                      onChange={() => setSelectedOption('exchange')}
                      className="mr-3 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <div>
                      <span className="text-gray-900 font-medium block">Exchange for another size/color</span>
                      <span className="text-gray-500 text-sm">We'll ship a replacement product to you</span>
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>
          
          {/* Exchange options - now using the ExchangeOptions component */}
          {selectedOption === 'exchange' && (
            <div className="mt-6">
              <ExchangeOptions 
                product={currentItem} 
                onExchangeDetailsChange={handleExchangeDetailsChange}
              />
            </div>
          )}
          
          {/* Continue button */}
          <div className="mt-6">
            <Button
              onClick={handleContinue}
              disabled={!selectedOption || (selectedOption === 'exchange' && !exchangeDetails)}
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