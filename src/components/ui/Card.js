// src/components/ui/Card.js
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/lib/context/ThemeContext';

export default function Card({
  children,
  title,
  subtitle,
  footer,
  padding = 'normal',
  elevation = 'low',
  className = '',
  animate = true,
  onClick,
  ...props
}) {
  const { theme } = useTheme();

  const paddingClasses = {
    none: '',
    small: 'p-3',
    normal: 'p-6',
    large: 'p-8',
  };

  // Updated elevation classes to use theme variables for border color
  const getElevationStyles = () => {
    // Base styles for all elevations
    const baseStyles = {
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: theme?.borderColor || 'var(--theme-border)',
    };

    // Add shadow based on elevation
    switch (elevation) {
      case 'high':
        return {
          ...baseStyles,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        };
      case 'medium':
        return {
          ...baseStyles,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        };
      case 'low':
        return {
          ...baseStyles,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        };
      case 'none':
      default:
        return baseStyles;
    }
  };

  // Get text colors from theme
  const getTextColors = () => ({
    title: theme?.textColor || 'var(--theme-text)',
    subtitle: theme?.secondaryTextColor || 'var(--theme-text-light)',
  });

  const CardComponent = animate ? motion.div : 'div';
  const animationProps = animate
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      }
    : {};

  const clickProps = onClick
    ? {
        onClick,
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick(e);
          }
        },
        style: {
          cursor: 'pointer',
        },
      }
    : {};

  const textColors = getTextColors();
  const elevationStyles = getElevationStyles();

  return (
    <CardComponent
      className={`
        rounded-xl overflow-hidden
        ${paddingClasses[padding] || paddingClasses.normal}
        ${className}
      `}
      style={{
        backgroundColor: theme?.backgroundColor || 'var(--theme-card, #ffffff)',
        ...elevationStyles,
        ...(onClick ? { '&:hover': { borderColor: 'var(--theme-secondary-300)' } } : {}),
        ...props.style,
      }}
      {...animationProps}
      {...clickProps}
      {...props}
    >
      {title && (
        <div className={`${padding !== 'none' ? 'mb-4' : ''}`}>
          <h3 className="text-lg font-medium" style={{ color: textColors.title }}>{title}</h3>
          {subtitle && <p className="mt-1 text-sm" style={{ color: textColors.subtitle }}>{subtitle}</p>}
        </div>
      )}
      
      <div>{children}</div>
      
      {footer && (
        <div 
          className={`${padding !== 'none' ? 'mt-6 -mb-4 -mx-6 p-4 border-t' : ''}`}
          style={{ 
            backgroundColor: theme?.backgroundColor || 'var(--theme-background)',
            borderColor: theme?.borderColor || 'var(--theme-border)'
          }}
        >
          {footer}
        </div>
      )}
    </CardComponent>
  );
}