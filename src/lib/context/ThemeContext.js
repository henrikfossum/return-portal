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

  // Wrap loadTheme in useCallback so its reference remains stable
  const loadTheme = useCallback(async () => {
    try {
      console.log('Loading theme - Start');
      setLoading(true);
      const themeConfig = await getTenantTheme(tenantId);
      
      console.group('Theme Loading');
      console.log('Tenant ID:', tenantId);
      console.log('Loaded Theme Config:', themeConfig);
      
      if (themeConfig) {
        // Log each theme property
        Object.entries(themeConfig).forEach(([key, value]) => {
          console.log(`Theme Property - ${key}:`, value);
        });

        setTheme(themeConfig);
        applyThemeToDom(themeConfig);

        // Load custom fonts if needed
        if (themeConfig.fontFamily) {
          console.log('Loading font:', themeConfig.fontFamily);
          loadCustomFont(themeConfig.fontFamily);
        }
      } else {
        console.warn('No theme configuration found');
      }
      console.groupEnd();
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]); // Recreate only when tenantId changes

  // Load theme when component mounts or tenantId changes
  useEffect(() => {
    console.log('ThemeProvider: Loading theme for tenant', tenantId);
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
    
    localStorage.setItem('colorMode', newMode);
  }, [mode]);
  
  // Check for saved color mode preference when component mounts
  useEffect(() => {
    const savedMode =
      localStorage.getItem('colorMode') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    if (savedMode === 'dark') {
      setMode('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Update theme settings and apply changes
  const updateTheme = async (newThemeSettings) => {
    try {
      setLoading(true);
      
      console.log('Updating theme with:', newThemeSettings);
      
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

  // Apply theme to DOM by setting CSS variables
  const applyThemeToDom = (themeConfig) => {
    console.log('Applying theme to DOM:', themeConfig);
    if (!themeConfig || typeof document === 'undefined') return;
    
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
    
    // Secondary color
    setCssVar('--theme-secondary-500', themeConfig.secondaryColor || '#64748b');
    setCssVar('--theme-secondary-200', lightenColor(themeConfig.secondaryColor, 0.6) || '#e2e8f0');
    setCssVar('--theme-secondary-700', darkenColor(themeConfig.secondaryColor, 0.4) || '#334155');
    
    // Other theme colors
    setCssVar('--theme-accent-500', themeConfig.accentColor || '#10b981');
    setCssVar('--theme-success-500', themeConfig.successColor || '#00b347');
    setCssVar('--theme-warning-500', themeConfig.warningColor || '#f59e0b');
    setCssVar('--theme-danger-500', themeConfig.dangerColor || '#e60000');
    
    // Base UI colors
    setCssVar('--theme-background', '#ffffff');
    setCssVar('--theme-surface', themeConfig.backgroundColor || '#ffffff');
    setCssVar('--theme-card', themeConfig.backgroundColor || '#ffffff');
    setCssVar('--theme-border', themeConfig.borderColor || '#e5e7eb');
    
    // Text colors
    setCssVar('--theme-text', themeConfig.textColor || '#171717');
    setCssVar('--theme-text-light', themeConfig.secondaryTextColor || '#6b7280');
    setCssVar('--theme-text-inverse', '#ffffff');
    
    // Typography
    setCssVar('--theme-font-family', themeConfig.fontFamily || 'Inter, system-ui, sans-serif');
    setCssVar('--theme-font-family-heading', themeConfig.headingFontFamily || themeConfig.fontFamily || 'Inter, system-ui, sans-serif');
    setCssVar('--theme-font-size-base', themeConfig.fontSize || '16px');
    
    // Legacy variables for compatibility
    setCssVar('--background', themeConfig.backgroundColor || '#ffffff');
    setCssVar('--foreground', themeConfig.textColor || '#171717');
    setCssVar('--input-text', themeConfig.textColor || '#000000');
    setCssVar('--input-placeholder', themeConfig.secondaryTextColor || '#6b7280');
    
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
    console.log('Theme applied to DOM successfully');
  };

  // Helper to set CSS variables
  const setCssVar = (name, value) => {
    console.log(`Setting CSS variable ${name} to ${value}`);
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(name, value);
    }
  };

  // Helper to load Google Fonts
  const loadCustomFont = (fontFamily) => {
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
  };

  // Helper to lighten a color
  const lightenColor = (color, factor) => {
    if (!color || !color.startsWith('#')) return null;
    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);
    r = Math.min(255, Math.round(r + (255 - r) * factor));
    g = Math.min(255, Math.round(g + (255 - g) * factor));
    b = Math.min(255, Math.round(b + (255 - b) * factor));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Helper to darken a color
  const darkenColor = (color, factor) => {
    if (!color || !color.startsWith('#')) return null;
    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);
    r = Math.max(0, Math.round(r * (1 - factor)));
    g = Math.max(0, Math.round(g * (1 - factor)));
    b = Math.max(0, Math.round(b * (1 - factor)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
