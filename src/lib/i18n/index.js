// Enhanced version of src/lib/i18n/index.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Import all translation files
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
  // Removed unused supportedLocales state
  
  // Function to change language - moved up before useEffect that depends on it
  const changeLocale = useCallback((newLocale) => {
    if (translations[newLocale]) {
      console.log(`Changing locale to ${newLocale}`);
      setLocale(newLocale);
      setMessages(translations[newLocale]);
      // Save preference in localStorage
      localStorage.setItem('preferredLocale', newLocale);
      
      // Force a re-render of the whole app
      document.documentElement.lang = newLocale;
      
      // Also update any date/number formatting
      try {
        document.documentElement.setAttribute('data-locale', newLocale);
      } catch (e) {
        console.warn('Error setting locale attribute:', e);
      }
    } else {
      console.error(`Locale ${newLocale} is not supported`);
    }
  }, []);
  
  // Initialize locale based on tenant settings and/or browser language
  useEffect(() => {
    async function initLocale() {
      try {
        // Try to get saved preference first
        const savedLocale = localStorage.getItem('preferredLocale');
        let detectedLocale = savedLocale || 'en';
        
        // If no saved preference, try to detect from browser if available
        if (!savedLocale) {
          try {
            // Simple approach: Get first part of navigator language
            const browserLang = navigator.language.split('-')[0];
            
            // Check if browser language is supported
            if (translations[browserLang]) {
              detectedLocale = browserLang;
            }
          } catch (e) {
            console.warn('Error detecting browser language:', e);
          }
        }
        
        // Set the locale and messages
        changeLocale(detectedLocale);
        
      } catch (error) {
        console.error('Error initializing locale:', error);
        
        // Fallback to English
        setLocale('en');
        setMessages(translations.en);
      }
    }
    
    initLocale();
  }, [tenantId, changeLocale]); // Added changeLocale to dependency array
  
  // Translation function with enhanced fallback and debugging
  const t = useCallback((key, params = {}) => {
    // Split the key by dots to navigate the messages object
    const parts = key.split('.');
    let message = parts.reduce((obj, k) => (obj && obj[k]) !== undefined ? obj[k] : null, messages);
    
    // If message not found, try to find in English as fallback
    if (message === null && locale !== 'en') {
      message = parts.reduce((obj, k) => (obj && obj[k]) !== undefined ? obj[k] : null, translations.en);
      
      // Log missing translation for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Missing translation for key "${key}" in locale "${locale}"`);
      }
    }
    
    // If still no translation found, return the key itself
    if (message === null) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Translation key not found: "${key}" (in any locale)`);
      }
      return key;
    }
    
    // Replace params in the message
    if (typeof message === 'string') {
      Object.entries(params).forEach(([paramKey, value]) => {
        message = message.replace(new RegExp(`{${paramKey}}`, 'g'), value);
      });
    }
    
    return message;
  }, [messages, locale]);

  // Format date according to locale
  const formatDate = useCallback((date, options = {}) => {
    return new Date(date).toLocaleDateString(locale, options);
  }, [locale]);

  // Format number according to locale
  const formatNumber = useCallback((number, options = {}) => {
    return new Intl.NumberFormat(locale, options).format(number);
  }, [locale]);

  // Format currency according to locale
  const formatCurrency = useCallback((amount, options = {}) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      ...options
    }).format(amount);
  }, [locale]);

  return (
    <LocaleContext.Provider
      value={{
        locale,
        supportedLocales: Object.keys(translations),
        changeLocale,
        t,
        formatDate,
        formatNumber,
        formatCurrency
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}