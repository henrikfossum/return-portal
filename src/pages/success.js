// src/pages/success.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle, ShoppingBag, ArrowRight, Printer, Mail, FileText } from 'lucide-react';
import ReturnLayout from '@/components/return/ReturnLayout';
import Button from '@/components/ui/Button';
import { motion } from 'framer-motion';

export default function Success() {
  const router = useRouter();
  
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
    <ReturnLayout currentStep={6} title="Return Complete">
      <div className="p-8">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-md mx-auto"
        >
          <div className="text-center mb-8">
            <motion.div
              variants={checkmarkVariants}
              className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6"
            >
              <CheckCircle className="w-8 h-8 text-green-600" />
            </motion.div>
            
            <motion.h2 variants={itemVariants} className="text-2xl font-bold text-gray-900 mb-2">
              Return Request Submitted
            </motion.h2>
            <motion.p variants={itemVariants} className="text-gray-600">
              Your return/exchange request has been successfully submitted. We'll email you with the next steps.
            </motion.p>
          </div>
          
          <motion.div 
            variants={itemVariants} 
            className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-blue-600" />
              Next Steps
            </h3>
            
            <ol className="space-y-4">
              <li className="flex">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Check your email</p>
                  <p className="text-sm text-gray-600 mt-1">
                    You'll receive a confirmation email with a shipping label and instructions.
                  </p>
                </div>
              </li>
              
              <li className="flex">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Print return label</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Print the shipping label attached to your confirmation email.
                  </p>
                </div>
              </li>
              
              <li className="flex">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Package your items</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Place the items you're returning in their original packaging if possible.
                  </p>
                </div>
              </li>
              
              <li className="flex">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Track your return</p>
                  <p className="text-sm text-gray-600 mt-1">
                    You can use the tracking number in your email to monitor your return status.
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
            >
              Return to Home
            </Button>
            
            <p className="mt-4 text-sm text-gray-500">
              If you have any questions, please contact <a href="mailto:support@example.com" className="text-blue-600 hover:underline">support@example.com</a>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </ReturnLayout>
  );
}