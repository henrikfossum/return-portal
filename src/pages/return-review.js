// src/pages/return-review.js - With proper translation and theme implementation
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
import { useLocale } from '@/lib/i18n';
import Trans from '@/lib/i18n/Trans';
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
  const { t } = useLocale();
  
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
      alert(t('return.review.acceptTermsAlert', 'Please accept the terms and conditions to continue'));
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
        title={t('return.review.title', 'Review Your Return')}
        showBackButton={true}
        onBackClick={handleBack}
      >
        <div className="p-6 text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">
              <Trans i18nKey="common.loading">Loading return details...</Trans>
            </p>
          </div>
        </div>
      </ReturnLayout>
    );
  }

  return (
    <ReturnLayout 
      currentStep={5} 
      title={t('return.review.chooseRefund', 'Return Method')}
      showBackButton={true}
      onBackClick={handleBack}
    >
      <div className="p-6 return-portal-container">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2 return-portal-heading">
            <Trans i18nKey="return.review.chooseRefund">Choose Your Refund Method</Trans>
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto return-portal-text-secondary">
            <Trans i18nKey="return.review.refundOptions">
              We offer you two refund options. Select the method that works best for you.
            </Trans>
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
            style={{
              borderColor: selectedOption === 'giftcard' 
                ? 'var(--theme-primary-color, #4f46e5)' 
                : 'var(--theme-border-color, #e5e7eb)',
              boxShadow: selectedOption === 'giftcard' 
                ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          >
            {/* Bonus Badge */}
            <div className="absolute top-0 right-0 m-2">
              <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                <Trans i18nKey="return.review.bonusAmount" params={{percent: (giftCardBonus * 100).toFixed(0)}}>
                  +{(giftCardBonus * 100).toFixed(0)}% BONUS
                </Trans>
              </span>
            </div>

            <div className="bg-blue-100 rounded-full p-3 mr-4 flex-shrink-0" 
                 style={{backgroundColor: 'rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.1)'}}>
              <Gift className="w-6 h-6 text-blue-600" style={{color: 'var(--theme-primary-color, #4f46e5)'}} />
            </div>
            
            <div className="flex-grow">
              <h3 className="text-lg font-bold text-gray-900 mb-1 return-portal-heading">
                <Trans i18nKey="return.review.maximizeReturn">Maximize Your Return</Trans>
              </h3>
              
              <p className="text-sm mb-2 return-portal-text-secondary">
                <Trans i18nKey="return.review.bonusDescription" params={{percent: (giftCardBonus * 100).toFixed(0)}}>
                  Enjoy an extra {(giftCardBonus * 100).toFixed(0)}% bonus – more money back in your pocket!
                </Trans>
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2" 
                   style={{
                     backgroundColor: 'rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.05)', 
                     borderColor: 'rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.2)'
                   }}>
                <div className="flex justify-between items-center text-sm">
                  <span className="return-portal-text-secondary">
                    <Trans i18nKey="return.review.originalValue">Original Value</Trans>
                  </span>
                  <span className="font-medium return-portal-text">
                    ${totalReturnValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-bold" style={{color: 'var(--theme-primary-color, #4f46e5)'}}>
                    <Trans i18nKey="return.review.giftCardValue">Gift Card Value</Trans>
                  </span>
                  <span className="font-bold" style={{color: 'var(--theme-primary-color, #4f46e5)'}}>
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
                  className="block w-full py-2 rounded-lg text-center font-bold transition-colors bg-blue-600 text-white hover:bg-blue-700 return-portal-button-primary"
                  style={{
                    backgroundColor: 'var(--theme-primary-color, #4f46e5)',
                    color: '#ffffff'
                  }}
                >
                  <Trans i18nKey="return.review.selectGiftCard">Select Gift Card</Trans>
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
            style={{
              borderColor: selectedOption === 'return' 
                ? 'var(--theme-secondary-color, #6b7280)' 
                : 'var(--theme-border-color, #e5e7eb)',
              boxShadow: selectedOption === 'return' 
                ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          >
            {/* Shipping Deduction Badge */}
            <div className="absolute top-0 right-0 m-2">
              <span className="bg-gradient-to-r from-red-100 to-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded-full flex items-center">
                <DollarSign className="w-3 h-3 mr-1" />
                <Trans i18nKey="return.review.shippingDeduction" params={{percent: (shippingDeductionRate * 100).toFixed(0)}}>
                  -{(shippingDeductionRate * 100).toFixed(0)}kr Shipping
                </Trans>
              </span>
            </div>

            <div className="bg-gray-100 rounded-full p-3 mr-4 flex-shrink-0">
              <CreditCard className="w-6 h-6 text-gray-600" />
            </div>
            
            <div className="flex-grow">
              <h3 className="text-lg font-bold text-gray-900 mb-1 return-portal-heading">
                <Trans i18nKey="return.review.originalPayment">Original Payment</Trans>
              </h3>
              
              <p className="text-sm mb-2 return-portal-text-secondary">
                <Trans i18nKey="return.returnOptions.returnDescription">
                  Refund to original method with shipping deduction
                </Trans>
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="return-portal-text-secondary">
                    <Trans i18nKey="return.review.originalValue">Original Value</Trans>
                  </span>
                  <span className="font-medium return-portal-text">
                    ${totalReturnValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-bold return-portal-text">
                    <Trans i18nKey="return.review.refundAmount">Refund Amount</Trans>
                  </span>
                  <span className="font-bold return-portal-text">
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
                  <Trans i18nKey="return.review.selectOriginalMethod">Select Original Method</Trans>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Items to Process Section */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6" 
             style={{backgroundColor: 'var(--theme-background-color, #f9fafb)'}}>
          <h3 className="text-lg font-bold mb-4 flex items-center return-portal-heading">
            <Package className="w-5 h-5 mr-2" style={{color: 'var(--theme-primary-color, #4f46e5)'}} />
            <Trans i18nKey="return.review.itemsToProcess">Items in Your Return</Trans>
          </h3>
          
          {itemsToReturn.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg">
              <p className="text-gray-500 return-portal-text-secondary">
                <Trans i18nKey="return.review.noItemsSelected">No items selected for return.</Trans>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {itemsToReturn.map((item) => (
                <div key={item.id} className="bg-white rounded-lg border p-4" 
                     style={{
                       backgroundColor: 'var(--theme-card-background, #ffffff)',
                       borderColor: 'var(--theme-border-color, #e5e7eb)'
                     }}>
                  <ProductCard
                    product={item}
                    showQuantitySelector={false}
                    returnOption={item.returnOption}
                    className="border-none p-0"
                  />
                  
                  <div className="mt-2 pl-4 text-sm return-portal-text-secondary">
                    <p>
                      <span className="font-medium return-portal-text">
                        <Trans i18nKey="return.returnReason.reasonLabel">Reason:</Trans>
                      </span> {item.returnReason?.reason || t('return.returnReason.notSpecified', 'Not specified')}
                    </p>
                    {item.returnReason?.additionalInfo && (
                      <p className="italic return-portal-text-secondary">{item.returnReason.additionalInfo}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Return Policy Agreement Section */}
        <div className="mb-6 p-6 rounded-2xl border" 
             style={{
               backgroundColor: 'rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.05)',
               borderColor: 'rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.2)'
             }}>
          <div className="flex items-start">
            <div className="flex items-center h-5 mr-4">
              <input
                id="terms"
                type="checkbox"
                className="h-5 w-5 border-gray-300 rounded focus:ring-blue-500"
                style={{
                  accentColor: 'var(--theme-primary-color, #4f46e5)',
                  borderColor: 'var(--theme-border-color, #e5e7eb)'
                }}
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
            </div>
            <div>
              <label htmlFor="terms" className="font-bold block mb-2" 
                     style={{color: 'var(--theme-primary-color, #4f46e5)'}}>
                <Trans i18nKey="return.review.termsAccept">Return Policy Agreement</Trans>
              </label>
              <p className="text-sm" style={{color: 'var(--theme-primary-color, #4f46e5)'}}>
                <Trans i18nKey="return.review.termsDescription">
                  By selecting a return method, I confirm that the items are in their original condition, 
                  unmodified, and meet the return policy requirements. I understand that the final refund 
                  may be subject to inspection.
                </Trans>
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
            className="w-full md:w-auto return-portal-button-primary"
            icon={<CheckCircle className="w-5 h-5" />}
          >
            {isSubmitting ? 
              t('return.review.processing', 'Processing...') : 
              t('return.review.completeReturn', 'Complete Return')}
          </Button>
        </div>
      </div>
    </ReturnLayout>
  );
}