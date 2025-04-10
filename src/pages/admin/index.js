// src/pages/index.js - With proper translation implementation
import { useState } from 'react';
import { Box, Search, Mail, XCircle } from 'lucide-react';
import { useReturnFlow } from '@/hooks/useReturnFlow';
import { useTenantTheme } from '@/lib/tenant/hooks';
import { useLocale } from '@/lib/i18n';
import Trans from '@/lib/i18n/Trans';
import ReturnLayout from '@/components/return/ReturnLayout';
import Button from '@/components/ui/Button';
import { motion } from 'framer-motion';

export default function Home() {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const { loading, error, lookupOrder } = useReturnFlow();
  const { theme } = useTenantTheme();
  const { t } = useLocale();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await lookupOrder(orderId, email);
    } catch (err) {
      // Error is already handled in the hook
      console.error('Error looking up order:', err);
    }
  };

  // Animation variants for form elements
  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({ 
      opacity: 1, 
      y: 0, 
      transition: { 
        delay: i * 0.1,
        duration: 0.4,
        ease: "easeOut" 
      } 
    })
  };

  return (
    <ReturnLayout currentStep={1} title={t('return.title')}>
      <div className="px-6 py-8 md:py-10">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
              <Box style={{ color: theme?.primaryColor }} className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              <Trans i18nKey="return.intro.title">Start Your Return</Trans>
            </h2>
            <p className="mt-2 text-gray-600">
              <Trans i18nKey="return.intro.subtitle">
                Enter your order details below to begin the return process
              </Trans>
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center p-4 mb-6 bg-red-50 border border-red-200 rounded-lg"
              >
                <XCircle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                <p className="text-sm text-red-700 flex-grow">{error}</p>
              </motion.div>
            )}

            <div className="space-y-6">
              <motion.div 
                custom={0}
                initial="hidden"
                animate="visible"
                variants={formVariants}
              >
                <label htmlFor="orderId" className="block text-sm font-medium text-gray-700 mb-2">
                  <Trans i18nKey="return.orderDetails.orderIdLabel">Order ID</Trans>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Box className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="orderId"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('return.orderDetails.orderIdPlaceholder', 'Enter your order ID')}
                    disabled={loading}
                    required
                  />
                </div>
              </motion.div>

              <motion.div
                custom={1}
                initial="hidden"
                animate="visible"
                variants={formVariants}
              >
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  <Trans i18nKey="return.orderDetails.emailLabel">Email Address</Trans>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('return.orderDetails.emailPlaceholder', 'Enter your email address')}
                    disabled={loading}
                    required
                  />
                </div>
              </motion.div>

              <motion.div
                custom={2}
                initial="hidden"
                animate="visible"
                variants={formVariants}
              >
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={loading}
                  icon={<Search className="w-4 h-4" />}
                  disabled={!orderId || !email || loading}
                >
                  {loading ? t('return.intro.lookingUp', 'Looking Up Order...') : t('return.intro.lookupOrder', 'Look Up Order')}
                </Button>
              </motion.div>
            </div>
          </form>
        </div>
      </div>
    </ReturnLayout>
  );
}