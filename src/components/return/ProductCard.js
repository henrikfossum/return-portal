// src/components/return/ProductCard.js with improved styling
import React from 'react';
import { Package } from 'lucide-react';
import Card from '@/components/ui/Card';
import Image from 'next/image';

export default function ProductCard({
  product,
  isSelected = false,
  quantity = 1,
  maxQuantity = 1,
  onQuantityChange,
  onSelect,
  showQuantitySelector = true,
  returnOption = null,
  className = '',
}) {
  const handleQuantityChange = (change) => {
    if (!onQuantityChange) return;
    
    const newQty = Math.max(0, Math.min(quantity + change, maxQuantity));
    onQuantityChange(product.id, newQty);
  };

  // Image loading priority cascade with better error handling
  const getImageUrl = () => {
    // Check each image source in order of preference
    if (product.variant_image) return product.variant_image;
    if (product.product_image) return product.product_image;
    if (product.imageUrl) return product.imageUrl;
    if (product.image?.src) return product.image.src;
    if (product.images && product.images.length > 0) return product.images[0].src;
    return null;
  };
  
  const imageUrl = getImageUrl();

  return (
    <Card
      elevation={isSelected ? 'medium' : 'low'}
      padding="small"
      className={`relative ${isSelected ? 'border-blue-500' : ''} ${className}`}
      onClick={onSelect ? () => onSelect(product.id) : undefined}
    >
      {/* Show quantity badge if product has multiple items */}
      {maxQuantity > 1 && (
        <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium z-10 shadow-sm">
          {maxQuantity}
        </div>
      )}
      
      <div className="flex items-start space-x-4">
        {/* Product image */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.title || product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Image failed to load:', {
                  src: imageUrl,
                  alt: product.title || product.name,
                  productId: product.id
                });
                // Replace with fallback icon
                e.target.style.display = 'none';
                e.target.parentNode.classList.add('flex', 'items-center', 'justify-center');
                // Add fallback icon container if not already present
                if (!e.target.nextElementSibling) {
                  const fallbackIcon = document.createElement('div');
                  fallbackIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><polyline points="16 16 20 12 16 8"/><line x1="4" y1="12" x2="20" y2="12"/></svg>';
                  e.target.parentNode.appendChild(fallbackIcon);
                }
              }}
            />
          ) : (
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Product title and variant */}
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {product.title || product.name}
          </h3>
          {product.variant_title && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {product.variant_title
                .split(' / ')
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .join(' • ')}
            </p>
          )}
          
          {/* Return option badge */}
          {returnOption && (
            <div className="mt-2">
              <span className={`
                inline-block px-2 py-1 text-xs rounded-full 
                ${returnOption === 'return' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}
              `}>
                {returnOption === 'return' ? 'Return' : 'Exchange'}
              </span>
            </div>
          )}
          
          {/* Quantity selector - UPDATED WITH BETTER CONTRAST */}
          {showQuantitySelector && onQuantityChange && (
            <div className="mt-2 flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(-1);
                }}
                className="p-2 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 disabled:opacity-50 touch-manipulation"
                disabled={quantity <= 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
              <span className="w-8 text-center text-sm sm:text-base text-gray-800 font-medium">
                {quantity}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(1);
                }}
                className="p-2 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 disabled:opacity-50 touch-manipulation"
                disabled={quantity >= maxQuantity}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}