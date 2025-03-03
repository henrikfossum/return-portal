// src/components/ui/Card.js
import React from 'react';
import { motion } from 'framer-motion';

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
  const paddingClasses = {
    none: '',
    small: 'p-3',
    normal: 'p-6',
    large: 'p-8',
  };

  const elevationClasses = {
    none: 'border border-gray-200',
    low: 'border border-gray-200 shadow-sm',
    medium: 'border border-gray-200 shadow-md',
    high: 'border border-gray-200 shadow-lg',
  };

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
        className: `${onClick ? 'cursor-pointer hover:border-gray-300' : ''}`,
      }
    : {};

  return (
    <CardComponent
      className={`
        bg-white rounded-xl overflow-hidden
        ${paddingClasses[padding] || paddingClasses.normal}
        ${elevationClasses[elevation] || elevationClasses.low}
        ${className}
      `}
      {...animationProps}
      {...clickProps}
      {...props}
    >
      {title && (
        <div className={`${padding !== 'none' ? 'mb-4' : ''}`}>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      
      <div>{children}</div>
      
      {footer && (
        <div className={`${padding !== 'none' ? 'mt-6 -mb-4 -mx-6 p-4 bg-gray-50 border-t border-gray-100' : ''}`}>
          {footer}
        </div>
      )}
    </CardComponent>
  );
}