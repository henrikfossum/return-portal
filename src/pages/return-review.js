// src/pages/return-review.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { 
  CheckCircle, 
  CreditCard, 
  Gift,
  DollarSign,
  Sparkles,
  Package
} from 'lucide-react';
import { useReturnFlow } from '@/hooks/useReturnFlow';
import { useTenantSettings } from '@/lib/tenant/hooks';
import ReturnLayout from '@/components/return/ReturnLayout';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/return/ProductCard';

export default function ReturnReview() {
  const router = useRouter();
  const {
    order,
    itemsToReturn,
    loading,
    completeReturn
  } = useReturnFlow();
  const { settings } = useTenantSettings();
  
  // Default return options with fallback values
  const giftCardBonus = settings?.returnOptions?.giftCardBonus ?? 0.10; // 10% bonus
  const shippingDeductionRate = settings?.returnOptions?.shippingDeductionRate ?? 0.79; // shipping cost deduction

  const [selectedOption, setSelectedOption] = useState('giftcard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Calculate total return value
  const calculateTotalReturnValue = () => {
    return itemsToReturn.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0);
  };

  const totalReturnValue = calculateTotalReturnValue();
  
  // Calculate gift card and return values
  const giftCardValue = totalReturnValue * (1 + giftCardBonus);
  const returnValueMinusShipping = totalReturnValue * (1 - shippingDeductionRate);

  // Redirect if no items to return
  useEffect(() => {
    if (!loading && (!order || !itemsToReturn.length)) {
      router.replace('/');
    }
  }, [order, itemsToReturn, loading, router]);

  // Handle back button
  const handleBack = () => {
    if (itemsToReturn.length > 0) {
      const lastItemId = itemsToReturn[itemsToReturn.length - 1].id;
      router.push(`/return-options/${lastItemId}`);
    } else {
      router.push('/');
    }
  };

  // Handle submit button click
  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!termsAccepted) {
      alert('Please accept the terms and conditions to continue');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const success = await completeReturn({
        returnMethod: selectedOption,
        returnValue: selectedOption === 'giftcard' ? giftCardValue : returnValueMinusShipping
      });
      if (success) {
        // Will be redirected to success page from the hook
      }
    } catch (err) {
      console.error('Error completing return:', err);
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <ReturnLayout 
      currentStep={5} 
      title="Return Method"
      showBackButton={true}
      onBackClick={handleBack}
    >
      <div className="p-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Refund Method</h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            We offer you two refund options. Select the method that works best for you.
          </p>
        </div>

        {/* Refund Method Selection - Vertical (stacked) Cards */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Gift Card Option */}
          <div 
            className={`
              relative flex items-center p-4 rounded-xl border-2 transition transform duration-200 cursor-pointer
              bg-gradient-to-r from-blue-50 to-blue-100
              ${selectedOption === 'giftcard' 
                ? 'shadow-xl border-blue-500 ring-4 ring-blue-200 scale-105' 
                : 'shadow-sm border-gray-200 hover:shadow-md hover:scale-105 hover:border-blue-300'}
            `}
            onClick={() => setSelectedOption('giftcard')}
          >
            {/* Bonus Badge */}
            <div className="absolute top-0 right-0 m-2">
              <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                +{(giftCardBonus * 100).toFixed(0)}% BONUS
              </span>
            </div>

            <div className="bg-blue-100 rounded-full p-3 mr-4 flex-shrink-0">
              <Gift className="w-6 h-6 text-blue-600" />
            </div>
            
            <div className="flex-grow">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Maximize Your Return
              </h3>
              
              <p className="text-gray-600 text-sm mb-2">
                Enjoy an extra {(giftCardBonus * 100).toFixed(0)}% bonus – more money back in your pocket!
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Original Value</span>
                  <span className="text-gray-900 font-medium">
                    ${totalReturnValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-blue-600 font-bold">Gift Card Value</span>
                  <span className="text-blue-800 font-bold">
                    ${giftCardValue.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="mt-2">
                <input
                  type="radio"
                  id="giftcard-option"
                  checked={selectedOption === 'giftcard'}
                  onChange={() => setSelectedOption('giftcard')}
                  className="hidden peer"
                />
                <label 
                  htmlFor="giftcard-option"
                  className="block w-full py-2 rounded-lg text-center font-bold transition-colors bg-blue-600 text-white hover:bg-blue-700"
                >
                  Select Gift Card
                </label>
              </div>
            </div>
          </div>

          {/* Standard Return Option */}
          <div 
            className={`
              relative flex items-center p-4 rounded-xl border-2 transition transform duration-200 cursor-pointer
              bg-gradient-to-r from-gray-50 to-gray-100
              ${selectedOption === 'return' 
                ? 'shadow-xl border-gray-500 ring-4 ring-gray-200 scale-105' 
                : 'shadow-sm border-gray-200 opacity-80 hover:shadow-md hover:scale-105 hover:opacity-100'}
            `}
            onClick={() => setSelectedOption('return')}
          >
            {/* Shipping Deduction Badge */}
            <div className="absolute top-0 right-0 m-2">
              <span className="bg-gradient-to-r from-red-100 to-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded-full flex items-center">
                <DollarSign className="w-3 h-3 mr-1" />
                -{(shippingDeductionRate * 100).toFixed(0)}kr Shipping
              </span>
            </div>

            <div className="bg-gray-100 rounded-full p-3 mr-4 flex-shrink-0">
              <CreditCard className="w-6 h-6 text-gray-600" />
            </div>
            
            <div className="flex-grow">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Original Payment</h3>
              
              <p className="text-gray-600 text-sm mb-2">
                Refund to original method with shipping deduction
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Original Value</span>
                  <span className="text-gray-900 font-medium">
                    ${totalReturnValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-700 font-bold">Refund Amount</span>
                  <span className="text-gray-900 font-bold">
                    ${returnValueMinusShipping.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="mt-2">
                <input
                  type="radio"
                  id="return-option"
                  checked={selectedOption === 'return'}
                  onChange={() => setSelectedOption('return')}
                  className="hidden peer"
                />
                <label 
                  htmlFor="return-option"
                  className="block w-full py-2 rounded-lg text-center font-bold transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Select Original Method
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Items to Process Section */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2 text-blue-600" />
            Items in Your Return
          </h3>
          
          {itemsToReturn.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg">
              <p className="text-gray-500">No items selected for return.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {itemsToReturn.map((item) => (
                <div key={item.id} className="bg-white rounded-lg border p-4">
                  <ProductCard
                    product={item}
                    showQuantitySelector={false}
                    returnOption={item.returnOption}
                    className="border-none p-0"
                  />
                  
                  <div className="mt-2 pl-4 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Reason:</span> {item.returnReason?.reason || 'Not specified'}
                    </p>
                    {item.returnReason?.additionalInfo && (
                      <p className="text-gray-500 italic">{item.returnReason.additionalInfo}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Return Policy Agreement Section */}
        <div className="mb-6 p-6 bg-blue-50 rounded-2xl border border-blue-100">
          <div className="flex items-start">
            <div className="flex items-center h-5 mr-4">
              <input
                id="terms"
                type="checkbox"
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
            </div>
            <div>
              <label htmlFor="terms" className="font-bold text-blue-900 block mb-2">
                Return Policy Agreement
              </label>
              <p className="text-blue-700 text-sm">
                By selecting a return method, I confirm that the items are in their original condition, 
                unmodified, and meet the return policy requirements. I understand that the final refund 
                may be subject to inspection.
              </p>
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={loading || isSubmitting || itemsToReturn.length === 0 || !termsAccepted}
            isLoading={loading || isSubmitting}
            variant="primary"
            size="lg"
            className="w-full md:w-auto"
            icon={<CheckCircle className="w-5 h-5" />}
          >
            {isSubmitting ? 'Processing...' : 'Complete Return'}
          </Button>
        </div>
      </div>
    </ReturnLayout>
  );
}
