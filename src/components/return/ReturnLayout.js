// Improved ReturnLayout.js with better theme variable usage
import React from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { useTheme } from '@/lib/context/ThemeContext';
import { useLocale } from '@/lib/i18n';
import Image from 'next/image';

// Step indicators for the return process
const steps = [
  { name: 'order', description: 'Enter order info' },
  { name: 'items', description: 'Choose return items' },
  { name: 'reason', description: 'Why returning' },
  { name: 'options', description: 'Return/exchange' },
  { name: 'review', description: 'Confirm request' },
  { name: 'done', description: 'Return complete' }
];

export default function ReturnLayout({ 
  children, 
  currentStep = 1, 
  title = 'Return Portal',
  showBackButton = false,
  onBackClick = null,
  className = '',
  hideProgressSteps = false,
}) {
  const { theme, loading: themeLoading } = useTheme();
  const { t, locale, supportedLocales, changeLocale } = useLocale();

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
  
  // If theme is loading, show a minimal loading state
  if (themeLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  // Language name mapping
  const localeNames = {
    en: 'English',
    no: 'Norsk'
  };

  // Create theme-based inline styles
  const containerStyle = {
    backgroundColor: theme?.backgroundColor || 'var(--theme-background-color, #ffffff)',
    color: theme?.textColor || 'var(--theme-text-color, #171717)',
  };
  
  const headingStyle = {
    color: theme?.primaryColor || 'var(--theme-primary-color, #4f46e5)',
    fontFamily: theme?.headingFontFamily || 'var(--theme-heading-font-family, var(--font-family-heading))'
  };
  
  const subtitleStyle = {
    color: theme?.secondaryTextColor || 'var(--theme-secondary-text-color, #6b7280)'
  };
  
  const cardStyle = {
    backgroundColor: theme?.cardBackground || 'var(--theme-card-background, #ffffff)',
    borderColor: theme?.borderColor || 'var(--theme-border-color, #e5e7eb)'
  };

  return (
    <div 
      className={`w-full min-h-screen flex flex-col return-portal-container ${className}`} 
      style={containerStyle}
    >
      <Head>
        <title>{title} | {t('return.title')}</title>
        <meta name="description" content={t('return.intro.subtitle')} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        {theme?.favicon && <link rel="icon" href={theme.favicon} />}
      </Head>
      
      <motion.div 
        className="flex-grow w-full max-w-xl mx-auto px-4 py-6 sm:px-6 lg:px-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header with possible logo */}
        <motion.div variants={childVariants} className="mb-4 text-center">
          {/* Show logo if available */}
          {theme?.logo && (
            <div className="flex justify-center mb-4">
              <Image 
                src={theme.logo} 
                alt={title}
                style={{ 
                  maxWidth: theme.logoWidth || '120px',
                  height: theme.logoHeight || 'auto'
                }}
                className="mx-auto"
              />
            </div>
          )}
        
          <h1 
            className="text-2xl font-bold return-portal-heading"
            style={headingStyle}
          >
            {t('return.title', title)}
          </h1>
          <p className="mt-1 text-sm return-portal-text-secondary" style={subtitleStyle}>
            {t('return.intro.subtitle')}
          </p>
        </motion.div>
        
        {/* Language selector if multiple languages are available */}
        {supportedLocales && supportedLocales.length > 1 && (
          <motion.div variants={childVariants} className="flex justify-end mb-2">
            <select
              value={locale}
              onChange={(e) => changeLocale(e.target.value)}
              className="text-xs border rounded px-2 py-1"
              style={{ borderColor: theme?.borderColor || 'var(--theme-border-color)' }}
            >
              {supportedLocales.map(code => (
                <option key={code} value={code}>
                  {localeNames[code] || code}
                </option>
              ))}
            </select>
          </motion.div>
        )}
        
        {/* Progress steps */}
        {!hideProgressSteps && (
          <motion.div variants={childVariants} className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-medium return-portal-text"
                style={{ color: theme?.textColor || 'var(--theme-text-color)' }}>
                {t(`return.steps.${steps[currentStep-1]?.name}`)}
              </h2>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full"
                style={{ 
                  color: theme?.secondaryTextColor || 'var(--theme-secondary-text-color)',
                  backgroundColor: theme?.backgroundColor || 'var(--theme-background-color)'
                }}>
                {currentStep} / {steps.length}
              </span>
            </div>
            
            <div className="relative">
              {/* Progress bar background */}
              <div className="overflow-hidden h-1.5 text-xs flex rounded bg-gray-200">
                <div 
                  style={{ 
                    width: `${(currentStep / steps.length) * 100}%`,
                    backgroundColor: theme?.primaryColor || 'var(--theme-primary-color)'
                  }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500"
                ></div>
              </div>
              
              {/* Step indicators */}
              <div className="flex justify-between text-xs px-1 mt-1.5"
                style={{ color: theme?.secondaryTextColor || 'var(--theme-secondary-text-color)' }}>
                {steps.map((step, index) => {
                  const stepNum = index + 1;
                  let status;
                  if (stepNum < currentStep) status = 'complete';
                  else if (stepNum === currentStep) status = 'current';
                  else status = 'upcoming';
                  
                  // Get step labels from translations
                  const stepLabel = t(`return.steps.${step.name}`);
                  
                  return (
                    <div key={step.name} className="flex flex-col items-center w-16">
                      <div className={`
                        w-5 h-5 rounded-full mb-1 flex items-center justify-center text-xs font-semibold
                        ${status === 'complete' ? 'bg-green-500 text-white' : ''}
                        ${status === 'current' ? 'border-2 text-blue-600' : ''}
                        ${status === 'upcoming' ? 'bg-gray-200 text-gray-700' : ''}
                      `}
                      style={
                        status === 'current' 
                          ? { borderColor: theme?.primaryColor || 'var(--theme-primary-color)', color: theme?.primaryColor || 'var(--theme-primary-color)' }
                          : status === 'complete'
                            ? { backgroundColor: theme?.successColor || 'var(--theme-success-color, #10b981)' }
                            : {}
                      }>
                        {status === 'complete' ? '✓' : stepNum}
                      </div>
                      <span className={`text-[0.7rem] text-center hidden sm:block
                        ${status === 'current' ? 'font-medium' : ''}
                      `}
                      style={
                        status === 'current' 
                          ? { color: theme?.primaryColor || 'var(--theme-primary-color)' }
                          : {}
                      }>
                        {stepLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Main content */}
        <motion.div 
            variants={childVariants}
            className="rounded-md shadow-md overflow-hidden return-portal-card"
            style={cardStyle}
          >
          {/* Back button if needed */}
          {showBackButton && onBackClick && (
            <div className="px-4 py-2 border-b"
              style={{ 
                backgroundColor: theme?.backgroundColor || 'var(--theme-background-color)',
                borderColor: theme?.borderColor || 'var(--theme-border-color)'
              }}>
              <button 
                onClick={onBackClick}
                className="flex items-center text-xs hover:text-gray-900"
                style={{ color: theme?.secondaryTextColor || 'var(--theme-secondary-text-color)' }}
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
                {t('common.back')}
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