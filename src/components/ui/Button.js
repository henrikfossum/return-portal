// src/components/ui/Button.js
import React from 'react';
import { motion } from 'framer-motion';
import { useTenantTheme } from '@/lib/tenant/hooks';

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  outline: 'bg-transparent border border-current hover:bg-gray-50 text-blue-600',
};

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
  const { theme } = useTenantTheme();
  const isDisabled = isLoading || disabled;
  
  // For primary buttons, we'll use inline styling for the background.
  // For all other variants, we'll rely on the static Tailwind classes.
  const getVariantClass = () => {
    if (variant === 'primary') {
      // Only set text and hover classes; background will be set inline.
      return 'text-white hover:opacity-90';
    }
    return variants[variant] || variants.primary;
  };

  const ButtonComponent = animate ? motion.button : 'button';
  const animationProps = animate
    ? {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
      }
    : {};

  // Apply the dynamic background only for primary variant using inline style.
  const inlineStyle =
    theme && variant === 'primary'
      ? { backgroundColor: theme.primaryColor }
      : {};

  return (
    <ButtonComponent
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      style={inlineStyle}
      className={`
        ${getVariantClass()}
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
