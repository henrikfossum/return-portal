// src/components/ui/Button.js - Updated with better theme variable usage
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/lib/context/ThemeContext';

const sizes = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  animate = true,
  onClick,
  ...props
}) {
  const { theme } = useTheme();
  const isDisabled = isLoading || disabled;
  
  // Helper function to darken/lighten colors
  const adjustColor = (color, amount) => {
    if (!color || !color.startsWith('#')) return color;
    
    const getColorValue = (hex, start, end) => parseInt(hex.slice(start, end), 16);
    
    // Extract RGB components
    const r = getColorValue(color, 1, 3);
    const g = getColorValue(color, 3, 5);
    const b = getColorValue(color, 5, 7);
    
    // Adjust the color (positive amount = lighten, negative = darken)
    const adjust = (value) => {
      if (amount >= 0) {
        // Lighten
        return Math.min(255, Math.floor(value + (255 - value) * amount));
      } else {
        // Darken
        return Math.max(0, Math.floor(value * (1 + amount)));
      }
    };
    
    const newR = adjust(r);
    const newG = adjust(g);
    const newB = adjust(b);
    
    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  // Get the appropriate styles based on variant and theme
  const getStyles = () => {
    // Base styles that apply to all variants
    const baseStyles = {
      borderRadius: '0.375rem', // rounded-md
      fontWeight: '500', // font-medium
      transition: 'all 0.2s',
    };
    
    // Use CSS variables as fallbacks for direct theme properties
    const primaryColor = theme?.primaryColor || 'var(--theme-primary-color, #4f46e5)';
    const secondaryColor = theme?.secondaryColor || 'var(--theme-secondary-color, #f59e0b)';
    const successColor = theme?.successColor || 'var(--theme-success-color, #10b981)';
    const dangerColor = theme?.dangerColor || 'var(--theme-danger-color, #ef4444)';
    // Removed unused textColor variable
    
    // Variant-specific styles
    switch (variant) {
      case 'primary':
        return {
          ...baseStyles,
          backgroundColor: primaryColor,
          color: '#ffffff',
          border: 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          ':hover': !isDisabled ? {
            backgroundColor: adjustColor(primaryColor, -0.15),
            opacity: 0.9,
          } : {},
        };
      case 'secondary':
        return {
          ...baseStyles,
          backgroundColor: secondaryColor,
          color: '#ffffff',
          border: 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          ':hover': !isDisabled ? {
            backgroundColor: adjustColor(secondaryColor, -0.15),
            opacity: 0.9,
          } : {},
        };
      case 'success':
        return {
          ...baseStyles,
          backgroundColor: successColor,
          color: '#ffffff',
          border: 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          ':hover': !isDisabled ? {
            backgroundColor: adjustColor(successColor, -0.15),
            opacity: 0.9,
          } : {},
        };
      case 'danger':
        return {
          ...baseStyles,
          backgroundColor: dangerColor,
          color: '#ffffff',
          border: 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          ':hover': !isDisabled ? {
            backgroundColor: adjustColor(dangerColor, -0.15),
            opacity: 0.9,
          } : {},
        };
      case 'outline':
        return {
          ...baseStyles,
          backgroundColor: 'transparent',
          color: primaryColor,
          border: `1px solid ${primaryColor}`,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          ':hover': !isDisabled ? {
            backgroundColor: 'rgba(79, 70, 229, 0.05)',
          } : {},
        };
      default:
        return baseStyles;
    }
  };

  const ButtonComponent = animate ? motion.button : 'button';
  const animationProps = animate && !isDisabled
    ? {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
      }
    : {};

  const buttonStyles = getStyles();
  
  // Add a class that can be targeted by the custom theme styles
  const themeClass = `return-portal-button-${variant}`;
  
  return (
    <ButtonComponent
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      style={buttonStyles}
      className={`
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${themeClass}
        rounded-lg font-medium transition-colors
        flex items-center justify-center
        ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}
        ${className}
      `}
      {...animationProps}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Loading...
        </span>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="mr-2">{icon}</span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="ml-2">{icon}</span>
          )}
        </>
      )}
    </ButtonComponent>
  );
}