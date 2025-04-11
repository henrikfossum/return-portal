// src/lib/context/ThemeContext.js - FIXED
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTenantTheme } from '../tenant/service';

// Create context
const ThemeContext = createContext();

// Custom hook to use theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Theme Provider Component
 */
export function ThemeProvider({ children, tenantId = 'default' }) {
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('light'); // 'light' or 'dark'

  // Helper to set CSS variables
  const setCssVar = useCallback((name, value) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(name, value);
    }
  }, []);

  // Helper to lighten a color
  const lightenColor = useCallback((color, factor) => {
    if (!color || !color.startsWith('#')) return null;
    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);
    r = Math.min(255, Math.round(r + (255 - r) * factor));
    g = Math.min(255, Math.round(g + (255 - g) * factor));
    b = Math.min(255, Math.round(b + (255 - b) * factor));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }, []);

  // Helper to darken a color
  const darkenColor = useCallback((color, factor) => {
    if (!color || !color.startsWith('#')) return null;
    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);
    r = Math.max(0, Math.round(r * (1 - factor)));
    g = Math.max(0, Math.round(g * (1 - factor)));
    b = Math.max(0, Math.round(b * (1 - factor)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }, []);

  // Helper to load Google Fonts
  const loadCustomFont = useCallback((fontFamily) => {
    if (typeof document === 'undefined') return;
    const fontName = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
    if (['system-ui', 'sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica', 'Times New Roman'].includes(fontName)) {
      return;
    }
    const existingLink = document.querySelector(`link[href*="${fontName}"]`);
    if (existingLink) return;
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // Extract RGB values from hex color for rgba usage
  const hexToRgb = useCallback((hex) => {
    if (!hex || !hex.startsWith('#')) return null;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }, []);

  // Apply theme to DOM - FIXED
  const applyThemeToDom = useCallback((themeConfig) => {
    console.log('Applying theme to DOM:', themeConfig);
    if (!themeConfig || typeof document === 'undefined') return;
    
    // Force removal of dark mode if light mode is active
    if (mode === 'light') {
      document.documentElement.classList.remove('dark');
    }
    
    // Apply to document element for global scope
    document.documentElement.style.setProperty('--theme-primary-color', themeConfig.primaryColor || '#4f46e5');
    document.documentElement.style.setProperty('--theme-secondary-color', themeConfig.secondaryColor || '#f59e0b');
    document.documentElement.style.setProperty('--theme-accent-color', themeConfig.accentColor || '#10b981');
    document.documentElement.style.setProperty('--theme-background-color', themeConfig.backgroundColor || '#ffffff');
    document.documentElement.style.setProperty('--theme-text-color', themeConfig.textColor || '#171717');
    document.documentElement.style.setProperty('--theme-secondary-text-color', themeConfig.secondaryTextColor || '#6b7280');
    document.documentElement.style.setProperty('--theme-border-color', themeConfig.borderColor || '#e5e7eb');
    document.documentElement.style.setProperty('--theme-font-family', themeConfig.fontFamily || 'Inter, system-ui, sans-serif');
    document.documentElement.style.setProperty('--theme-heading-font-family', themeConfig.headingFontFamily || themeConfig.fontFamily || 'Inter, system-ui, sans-serif');
    document.documentElement.style.setProperty('--theme-font-size', themeConfig.fontSize || '16px');
    
    // Add RGB versions of colors for opacity usage
    const primaryRgb = hexToRgb(themeConfig.primaryColor);
    if (primaryRgb) {
      document.documentElement.style.setProperty('--theme-primary-color-rgb', primaryRgb);
    }
    
    // Primary color and shades
    setCssVar('--theme-primary-50', lightenColor(themeConfig.primaryColor, 0.9) || '#e6f2ff');
    setCssVar('--theme-primary-100', lightenColor(themeConfig.primaryColor, 0.8) || '#b3daff');
    setCssVar('--theme-primary-200', lightenColor(themeConfig.primaryColor, 0.6) || '#80c2ff');
    setCssVar('--theme-primary-300', lightenColor(themeConfig.primaryColor, 0.4) || '#4da9ff');
    setCssVar('--theme-primary-400', lightenColor(themeConfig.primaryColor, 0.2) || '#1a91ff');
    setCssVar('--theme-primary-500', themeConfig.primaryColor || '#0077e6');
    setCssVar('--theme-primary-600', darkenColor(themeConfig.primaryColor, 0.2) || '#0060b8');
    setCssVar('--theme-primary-700', darkenColor(themeConfig.primaryColor, 0.4) || '#004a8a');
    setCssVar('--theme-primary-800', darkenColor(themeConfig.primaryColor, 0.6) || '#00335c');
    setCssVar('--theme-primary-900', darkenColor(themeConfig.primaryColor, 0.8) || '#001d33');
    
    // Also apply directly to body styles with !important to override any conflicting styles
    document.body.style.backgroundColor = (themeConfig.backgroundColor || '#ffffff') + ' !important';
    document.body.style.color = themeConfig.textColor || '#171717';
    document.body.style.fontFamily = themeConfig.fontFamily || 'Inter, system-ui, sans-serif';
    document.body.style.fontSize = themeConfig.fontSize || '16px';
    
    // Add specific class to body for additional styling hook
    document.body.classList.add('theme-applied');
    
    // Apply custom CSS if provided
    if (themeConfig.customCSS) {
      let styleElement = document.getElementById('custom-theme-css');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'custom-theme-css';
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = themeConfig.customCSS;
    }
    
    // Add specific scoped styles to ensure theming works in the return portal
    const returnPortalStyles = `
      .return-portal-container {
        background-color: ${themeConfig.backgroundColor || '#ffffff'} !important;
        color: ${themeConfig.textColor || '#171717'};
      }
      .return-portal-card {
        background-color: ${themeConfig.cardBackground || '#ffffff'};
        border-color: ${themeConfig.borderColor || '#e5e7eb'};
      }
      .return-portal-heading {
        color: ${themeConfig.primaryColor || '#4f46e5'};
        font-family: ${themeConfig.headingFontFamily || themeConfig.fontFamily || 'Inter, system-ui, sans-serif'};
      }
      .return-portal-button-primary {
        background-color: ${themeConfig.primaryColor || '#4f46e5'};
        color: #ffffff;
      }
      .return-portal-button-secondary {
        background-color: ${themeConfig.secondaryColor || '#f59e0b'};
        color: #ffffff;
      }
      .return-portal-text {
        color: ${themeConfig.textColor || '#171717'};
      }
      .return-portal-text-secondary {
        color: ${themeConfig.secondaryTextColor || '#6b7280'};
      }
      body {
        background-color: ${themeConfig.backgroundColor || '#ffffff'} !important;
      }
      body.theme-applied {
        background-color: ${themeConfig.backgroundColor || '#ffffff'} !important;
      }
    `;
    
    let portalStyleElement = document.getElementById('return-portal-theme-styles');
    if (!portalStyleElement) {
      portalStyleElement = document.createElement('style');
      portalStyleElement.id = 'return-portal-theme-styles';
      document.head.appendChild(portalStyleElement);
    }
    portalStyleElement.textContent = returnPortalStyles;
    
    console.log('Theme applied to DOM successfully');
  }, [setCssVar, lightenColor, darkenColor, hexToRgb, mode]);

  // Wrap loadTheme in useCallback so its reference remains stable
  const loadTheme = useCallback(async () => {
    try {
      setLoading(true);
      const themeConfig = await getTenantTheme(tenantId);
      
      if (themeConfig) {
        setTheme(themeConfig);
        applyThemeToDom(themeConfig);

        // Load custom fonts if needed
        if (themeConfig.fontFamily) {
          loadCustomFont(themeConfig.fontFamily);
        }
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, applyThemeToDom, loadCustomFont]);

  // Load theme when component mounts or tenantId changes
  useEffect(() => {
    loadTheme();
  }, [tenantId, loadTheme]);

  // Toggle between light and dark mode
  const toggleMode = useCallback(() => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    
    if (newMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Reapply theme after mode change to ensure colors update
    if (theme) {
      applyThemeToDom(theme);
    }
    
    localStorage.setItem('colorMode', newMode);
  }, [mode, theme, applyThemeToDom]);
  
  // Check for saved color mode preference when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode =
        localStorage.getItem('colorMode') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      
      if (savedMode === 'dark') {
        setMode('dark');
        document.documentElement.classList.add('dark');
      } else {
        // Explicitly remove dark mode class to ensure light mode is active
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  // Update theme settings and apply changes
  const updateTheme = async (newThemeSettings) => {
    try {
      setLoading(true);
      
      const updatedTheme = {
        ...theme,
        ...newThemeSettings,
      };
      
      setTheme(updatedTheme);
      applyThemeToDom(updatedTheme);
      
      if (newThemeSettings.fontFamily && newThemeSettings.fontFamily !== theme?.fontFamily) {
        loadCustomFont(newThemeSettings.fontFamily);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating theme:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        loading,
        mode,
        toggleMode,
        updateTheme,
        loadTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}