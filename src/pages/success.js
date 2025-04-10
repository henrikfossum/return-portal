// src/pages/success.js - With proper translation and theme implementation
import { useRouter } from 'next/router';
import { CheckCircle, ShoppingBag, ArrowRight, Printer, Mail, FileText } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import Trans from '@/lib/i18n/Trans';
import ReturnLayout from '@/components/return/ReturnLayout';
import Button from '@/components/ui/Button';
import { motion } from 'framer-motion';

export default function Success() {
  const router = useRouter();
  const { t } = useLocale();
  
  // Handle return to home button
  const handleReturnHome = () => {
    router.push('/');
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const checkmarkVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 200,
        damping: 10,
        delay: 0.1
      }
    }
  };

  return (
    <ReturnLayout currentStep={6} title={t('return.success.title', 'Return Complete')}>
      <div className="p-8 return-portal-container">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-md mx-auto"
        >
          <div className="text-center mb-8">
            <motion.div
              variants={checkmarkVariants}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
              style={{ 
                backgroundColor: 'rgba(var(--theme-success-color-rgb, 16, 185, 129), 0.1)'
              }}
            >
              <CheckCircle className="w-8 h-8" 
                style={{ color: 'var(--theme-success-color, #10b981)' }}
              />
            </motion.div>
            
            <motion.h2 variants={itemVariants} className="text-2xl font-bold mb-2 return-portal-heading">
              <Trans i18nKey="return.success.subtitle">Return Request Submitted</Trans>
            </motion.h2>
            <motion.p variants={itemVariants} className="return-portal-text-secondary">
              <Trans i18nKey="return.success.message">
                Your return/exchange request has been successfully submitted. We'll email you with the next steps.
              </Trans>
            </motion.p>
          </div>
          
          <motion.div 
            variants={itemVariants} 
            className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8"
            style={{
              backgroundColor: 'var(--theme-background-color, #f9fafb)',
              borderColor: 'var(--theme-border-color, #e5e7eb)'
            }}
          >
            <h3 className="text-lg font-medium mb-4 flex items-center return-portal-heading">
              <ShoppingBag className="w-5 h-5 mr-2" style={{ color: 'var(--theme-primary-color, #4f46e5)' }} />
              <Trans i18nKey="return.success.nextSteps">Next Steps</Trans>
            </h3>
            
            <ol className="space-y-4">
              <li className="flex">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full mr-3"
                     style={{ 
                       backgroundColor: 'rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.1)',
                       color: 'var(--theme-primary-color, #4f46e5)' 
                     }}>
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium return-portal-text">
                    <Trans i18nKey="return.success.steps.email.title">Check your email</Trans>
                  </p>
                  <p className="text-sm mt-1 return-portal-text-secondary">
                    <Trans i18nKey="return.success.steps.email.description">
                      You'll receive a confirmation email with a shipping label and instructions.
                    </Trans>
                  </p>
                </div>
              </li>
              
              <li className="flex">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full mr-3"
                     style={{ 
                       backgroundColor: 'rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.1)',
                       color: 'var(--theme-primary-color, #4f46e5)' 
                     }}>
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium return-portal-text">
                    <Trans i18nKey="return.success.steps.print.title">Print return label</Trans>
                  </p>
                  <p className="text-sm mt-1 return-portal-text-secondary">
                    <Trans i18nKey="return.success.steps.print.description">
                      Print the shipping label attached to your confirmation email.
                    </Trans>
                  </p>
                </div>
              </li>
              
              <li className="flex">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full mr-3"
                     style={{ 
                       backgroundColor: 'rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.1)',
                       color: 'var(--theme-primary-color, #4f46e5)' 
                     }}>
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium return-portal-text">
                    <Trans i18nKey="return.success.steps.package.title">Package your items</Trans>
                  </p>
                  <p className="text-sm mt-1 return-portal-text-secondary">
                    <Trans i18nKey="return.success.steps.package.description">
                      Place the items you're returning in their original packaging if possible.
                    </Trans>
                  </p>
                </div>
              </li>
              
              <li className="flex">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full mr-3"
                     style={{ 
                       backgroundColor: 'rgba(var(--theme-primary-color-rgb, 79, 70, 229), 0.1)',
                       color: 'var(--theme-primary-color, #4f46e5)' 
                     }}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium return-portal-text">
                    <Trans i18nKey="return.success.steps.track.title">Track your return</Trans>
                  </p>
                  <p className="text-sm mt-1 return-portal-text-secondary">
                    <Trans i18nKey="return.success.steps.track.description">
                      You can use the tracking number in your email to monitor your return status.
                    </Trans>
                  </p>
                </div>
              </li>
            </ol>
          </motion.div>
          
          <motion.div variants={itemVariants} className="text-center">
            <Button
              onClick={handleReturnHome}
              variant="primary"
              size="lg"
              icon={<ArrowRight className="w-5 h-5" />}
              iconPosition="right"
              className="return-portal-button-primary"
            >
              <Trans i18nKey="return.success.returnHome">Return to Home</Trans>
            </Button>
            
            <p className="mt-4 text-sm return-portal-text-secondary">
              <Trans i18nKey="return.success.support">
                If you have any questions, please contact
              </Trans>{' '}
              <a 
                href="mailto:support@example.com" 
                className="hover:underline"
                style={{ color: 'var(--theme-primary-color, #4f46e5)' }}
              >
                support@example.com
              </a>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </ReturnLayout>
  );
}