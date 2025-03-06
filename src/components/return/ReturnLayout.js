// src/components/return/ReturnLayout.js
import React from 'react';
import Head from 'next/head';
import { useTenantTheme } from '@/lib/tenant/hooks';
import { motion } from 'framer-motion';

// Step indicators for the return process
const steps = [
  { name: 'Order', description: 'Enter order info' },
  { name: 'Items', description: 'Choose return items' },
  { name: 'Reason', description: 'Why returning' },
  { name: 'Options', description: 'Return/exchange' },
  { name: 'Review', description: 'Confirm request' },
  { name: 'Done', description: 'Return complete' }
];

export default function ReturnLayout({ 
  children, 
  currentStep = 1, 
  title = 'Return Portal',
  showBackButton = false,
  onBackClick = null
}) {
  const { theme } = useTenantTheme();

  // Simplified animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const childVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2 }
    }
  };
  
  return (
    <div className="bg-white py-4 px-2 sm:px-4">
      <Head>
        <title>{title} | Return Portal</title>
        <meta name="description" content="Easy returns and exchanges" />
      </Head>
      
      <motion.div 
        className="max-w-xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div variants={childVariants} className="mb-4 text-center">
          <h1 
            className="text-2xl font-bold"
            style={{ color: theme?.primaryColor || '#4f46e5' }}
          >
            Return Portal
          </h1>
          <p className="mt-1 text-gray-800 text-sm">
            Simple and hassle-free returns
          </p>
        </motion.div>
        
        {/* Progress steps */}
        <motion.div variants={childVariants} className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-base font-medium text-gray-900">
              {steps[currentStep-1]?.name || 'Return Process'}
            </h2>
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
              Step {currentStep} of {steps.length}
            </span>
          </div>
          
          <div className="relative">
            {/* Progress bar background */}
            <div className="overflow-hidden h-1.5 text-xs flex rounded bg-gray-200">
              <div 
                style={{ 
                  width: `${(currentStep / steps.length) * 100}%`,
                  backgroundColor: theme?.primaryColor || '#4f46e5'
                }} 
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500"
              ></div>
            </div>
            
            {/* Step indicators */}
            <div className="flex justify-between text-xs text-gray-800 px-1 mt-1.5">
              {steps.map((step, index) => {
                const stepNum = index + 1;
                let status;
                if (stepNum < currentStep) status = 'complete';
                else if (stepNum === currentStep) status = 'current';
                else status = 'upcoming';
                
                return (
                  <div key={step.name} className="flex flex-col items-center w-16">
                    <div className={`
                      w-5 h-5 rounded-full mb-1 flex items-center justify-center text-xs font-semibold
                      ${status === 'complete' ? 'bg-green-500 text-white' : ''}
                      ${status === 'current' ? 'border-2 border-blue-600 text-blue-600' : ''}
                      ${status === 'upcoming' ? 'bg-gray-200 text-gray-700' : ''}
                    `}>
                      {status === 'complete' ? '✓' : stepNum}
                    </div>
                    <span className={`text-[0.7rem] text-center hidden sm:block
                      ${status === 'current' ? 'font-medium text-blue-600' : 'text-gray-800'}
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
          className="rounded-md shadow-md overflow-hidden"
        >
          {/* Back button if needed */}
          {showBackButton && onBackClick && (
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <button 
                onClick={onBackClick}
                className="flex items-center text-xs text-gray-800 hover:text-gray-900"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-3 w-3 mr-1" 
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
      </motion.div>
    </div>
  );
}