// src/lib/i18n/index.js
import { createContext, useContext, useState, useEffect } from 'react';

// Import only the translation files we've created
import en from './locales/en';
import no from './locales/no';

// Create a translations object with available languages
const translations = {
  en,
  no
};

// Create the localization context
const LocaleContext = createContext();

// Custom hook to use the localization context
export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

export function LocaleProvider({ children, tenantId = 'default' }) {
  const [locale, setLocale] = useState('en');
  const [messages, setMessages] = useState(translations.en);
  
  // Initialize locale based on tenant settings and/or browser language
  useEffect(() => {
    async function initLocale() {
      try {
        // Fetch tenant settings
        const response = await fetch(`/api/tenant/settings?tenantId=${tenantId}`);
        const settings = await response.json();
        
        let detectedLocale = 'en'; // Default to English
        
        // If browser language detection is enabled, check browser language
        if (settings.locale?.detectBrowserLanguage) {
          const browserLang = navigator.language.split('-')[0];
          
          // Check if browser language is supported
          if (settings.locale.supportedLanguages.includes(browserLang) && 
              translations[browserLang]) {
            detectedLocale = browserLang;
          }
        }
        
        // Use the tenant's default language if no detection or not supported
        const finalLocale = detectedLocale || settings.locale?.defaultLanguage || 'en';
        
        // Ensure the locale exists in our translations
        const safeLocale = translations[finalLocale] ? finalLocale : 'en';
        
        // Set the locale and messages
        setLocale(safeLocale);
        setMessages(translations[safeLocale]);
      } catch (error) {
        console.error('Error initializing locale:', error);
        
        // Fallback to English
        setLocale('en');
        setMessages(translations.en);
      }
    }
    
    initLocale();
  }, [tenantId]);
  
  // Function to change language
  const changeLocale = (newLocale) => {
    if (translations[newLocale]) {
      setLocale(newLocale);
      setMessages(translations[newLocale]);
      // Optionally save preference in localStorage
      localStorage.setItem('preferredLocale', newLocale);
    } else {
      console.error(`Locale ${newLocale} is not supported`);
    }
  };
  
  // Translation function
  const t = (key, params = {}) => {
    let message = key.split('.').reduce((obj, k) => (obj && obj[k]) || null, messages) || key;
    
    // Replace params in the message
    if (typeof message === 'string') {
      Object.entries(params).forEach(([paramKey, value]) => {
        message = message.replace(new RegExp(`{${paramKey}}`, 'g'), value);
      });
    }
    
    return message;
  };
  
  return (
    <LocaleContext.Provider
      value={{
        locale,
        changeLocale,
        t,
        supportedLocales: Object.keys(translations)
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

// Helper function to format dates according to locale
export function formatDate(date, locale = 'en', options = {}) {
  return new Date(date).toLocaleDateString(locale, options);
}

// Helper function to format numbers according to locale
export function useNumberFormatter() {
  const locale = useLocale();
  
  const formatNumber = useCallback((number, options = {}) => {
    // Implementation
    return new Intl.NumberFormat(locale, options).format(number);
  }, [locale]);
  
  return formatNumber;
}

export function useCurrencyFormatter() {
  const locale = useLocale();
  
  const formatCurrency = useCallback((amount, options = {}) => {
    // Implementation
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      ...options
    }).format(amount);
  }, [locale]);
  
  return formatCurrency;
}