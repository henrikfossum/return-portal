// src/components/return/ReturnLayout.js
import React from 'react';
import Head from 'next/head';
import { useTenantTheme } from '@/lib/tenant/hooks';
import { motion } from 'framer-motion';

// Step indicators for the return process
const steps = [
  { name: 'Order Lookup', description: 'Enter your order information' },
  { name: 'Select Items', description: 'Choose items to return' },
  { name: 'Return Reason', description: 'Tell us why you\'re returning' },
  { name: 'Return Options', description: 'Return or exchange' },
  { name: 'Review', description: 'Confirm your request' },
  { name: 'Confirmation', description: 'Return complete' }
];

export default function ReturnLayout({ 
  children, 
  currentStep = 1, 
  title = 'Return Portal',
  showBackButton = false,
  onBackClick = null
}) {
  const { theme } = useTenantTheme();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <Head>
        <title>{title} | Return Portal</title>
        <meta name="description" content="Easy returns and exchanges" />
      </Head>
      
      <motion.div 
        className="max-w-3xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div variants={childVariants} className="mb-8 text-center">
          <h1 
            className="text-3xl font-bold"
            style={{ color: theme?.primaryColor || '#4f46e5' }}
          >
            Return Portal
          </h1>
          <p className="mt-2 text-gray-600">
            We make returns and exchanges simple and hassle-free
          </p>
        </motion.div>
        
        {/* Progress steps */}
        <motion.div variants={childVariants} className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-medium text-gray-900">
              {steps[currentStep-1]?.name || 'Return Process'}
            </h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              Step {currentStep} of {steps.length}
            </span>
          </div>
          
          <div className="relative">
            {/* Progress bar background */}
            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
              <div 
                style={{ 
                  width: `${(currentStep / steps.length) * 100}%`,
                  backgroundColor: theme?.primaryColor || '#4f46e5'
                }} 
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500"
              ></div>
            </div>
            
            {/* Step indicators */}
            <div className="flex justify-between text-xs text-gray-600 px-2 mt-2">
              {steps.map((step, index) => {
                const stepNum = index + 1;
                let status;
                if (stepNum < currentStep) status = 'complete';
                else if (stepNum === currentStep) status = 'current';
                else status = 'upcoming';
                
                return (
                  <div key={step.name} className="flex flex-col items-center w-24">
                    <div className={`
                      w-6 h-6 rounded-full mb-1 flex items-center justify-center text-xs font-semibold
                      ${status === 'complete' ? 'bg-green-500 text-white' : ''}
                      ${status === 'current' ? 'border-2 border-blue-600 text-blue-600' : ''}
                      ${status === 'upcoming' ? 'bg-gray-200 text-gray-500' : ''}
                    `}>
                      {status === 'complete' ? '✓' : stepNum}
                    </div>
                    <span className={`text-xs text-center hidden sm:block
                      ${status === 'current' ? 'font-medium text-blue-600' : 'text-gray-500'}
                    `}>
                      {step.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
        
        {/* Main content */}
        <motion.div 
          variants={childVariants}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          {/* Back button if needed */}
          {showBackButton && onBackClick && (
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <button 
                onClick={onBackClick}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 mr-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>
          )}
          
          {/* Content */}
          {children}
        </motion.div>
        
        {/* Footer */}
        <motion.div variants={childVariants} className="mt-8 text-center text-sm text-gray-500">
          <p>Need help? <a href="#" className="text-blue-600 hover:underline">Contact customer support</a></p>
        </motion.div>
      </motion.div>
    </div>
  );
}