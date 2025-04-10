// src/lib/i18n/Trans.js
import React from 'react';
import { useLocale } from '@/lib/i18n';

/**
 * Translation component for consistent text translation
 * Usage: <Trans i18nKey="return.title" />
 * Or with parameters: <Trans i18nKey="greeting" params={{name: 'John'}} />
 */
export default function Trans({ i18nKey, params = {}, children, className = '', style = {} }) {
  const { t } = useLocale();
  
  // If no key is provided, render children or empty string
  if (!i18nKey) {
    return <span className={className} style={style}>{children || ''}</span>;
  }
  
  // Get translated text using the t function
  const translatedText = t(i18nKey, params);
  
  // Fallback to key or children if translation is missing
  const content = translatedText === i18nKey ? (children || i18nKey) : translatedText;
  
  return (
    <span className={className} style={style}>{content}</span>
  );
}