// src/components/ui/Button.js
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
  
  // Get the appropriate styles based on variant and theme
  const getStyles = () => {
    // Base styles that apply to all variants
    const baseStyles = {
      borderRadius: '0.375rem', // rounded-md
      fontWeight: '500', // font-medium
      transition: 'all 0.2s',
    };
    
    // Variant-specific styles
    switch (variant) {
      case 'primary':
        return {
          ...baseStyles,
          backgroundColor: theme?.primaryColor || 'var(--color-primary, #4f46e5)',
          color: '#ffffff',
          border: 'none',
          ':hover': {
            backgroundColor: theme?.primaryColor ? adjustColor(theme.primaryColor, -15) : 'var(--color-primary-dark, #3c35b5)',
            opacity: 0.9,
          },
        };
      case 'secondary':
        return {
          ...baseStyles,
          backgroundColor: theme?.secondaryColor || 'var(--color-secondary, #f59e0b)',
          color: '#ffffff',
          border: 'none',
          ':hover': {
            backgroundColor: theme?.secondaryColor ? adjustColor(theme.secondaryColor, -15) : 'var(--color-secondary-dark, #d97706)',
            opacity: 0.9,
          },
        };
      case 'success':
        return {
          ...baseStyles,
          backgroundColor: theme?.successColor || 'var(--color-success, #10b981)',
          color: '#ffffff',
          border: 'none',
          ':hover': {
            backgroundColor: theme?.successColor ? adjustColor(theme.successColor, -15) : 'var(--color-success-dark, #059669)',
            opacity: 0.9,
          },
        };
      case 'danger':
        return {
          ...baseStyles,
          backgroundColor: theme?.dangerColor || 'var(--color-danger, #ef4444)',
          color: '#ffffff',
          border: 'none',
          ':hover': {
            backgroundColor: theme?.dangerColor ? adjustColor(theme.dangerColor, -15) : 'var(--color-danger-dark, #dc2626)',
            opacity: 0.9,
          },
        };
      case 'outline':
        return {
          ...baseStyles,
          backgroundColor: 'transparent',
          color: theme?.primaryColor || 'var(--color-primary, #4f46e5)',
          border: `1px solid ${theme?.primaryColor || 'var(--color-primary, #4f46e5)'}`,
          ':hover': {
            backgroundColor: 'rgba(79, 70, 229, 0.05)',
          },
        };
      default:
        return baseStyles;
    }
  };

  // Helper function to darken/lighten colors
  const adjustColor = (color, amount) => {
    // Simple implementation; in a real app you would use a proper color library
    return color; // For now, just return the original color
  };

  const ButtonComponent = animate ? motion.button : 'button';
  const animationProps = animate
    ? {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
      }
    : {};

  const buttonStyles = getStyles();
  
  return (
    <ButtonComponent
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      style={buttonStyles}
      className={`
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
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