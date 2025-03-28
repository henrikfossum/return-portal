// src/components/return/ExchangeOptions.js
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Check } from 'lucide-react';

export default function ExchangeOptions({ 
  product, 
  onExchangeDetailsChange,
}) {
  // State for loading and error handling
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for full product data (for Shopify actions)
  const [productData, setProductData] = useState(null);
  // State for product variants
  const [variants, setVariants] = useState([]);
  
  // State for option types and values
  const [sizeOptions, setSizeOptions] = useState([]);
  const [colorOptions, setColorOptions] = useState([]);
  const [otherOptions, setOtherOptions] = useState({});

  // State for current (original) selections
  const [originalOptions, setOriginalOptions] = useState({
    size: '',
    color: '',
    other: {}
  });
  
  // State for selected options
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedOtherOptions, setSelectedOtherOptions] = useState({});
  
  // State for the selected variant
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Fetch product variants (and full product data) when component mounts
  useEffect(() => {
    async function fetchProductVariants() {
      if (!product || !product.product_id) {
        setError('Product information is missing');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/products/variants?productId=${product.product_id}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch product variants: ${errorText}`);
        }
        
        const data = await response.json();
        // Save full product data for Shopify actions
        setProductData(data);
        
        // Process variants
        if (data.variants) {
          setVariants(data.variants);
        }
        
        // Extract size options directly from variants
        const sizes = data.variants
          .filter(variant => variant.inventory > 0)
          .map(variant => variant.option1)
          .filter((value, index, self) => self.indexOf(value) === index);
  
        setSizeOptions(sizes);
        
        // Extract color options directly from variants, if available
        const colors = data.variants
          .filter(variant => variant.inventory > 0 && variant.option2)
          .map(variant => variant.option2)
          .filter((value, index, self) => self.indexOf(value) === index);
  
        setColorOptions(colors);
        
        // Optionally, set otherOptions if available in the data
        // For example, if your API returns additional option data:
        if (data.otherOptions) {
          setOtherOptions(data.otherOptions);
        }
        
      } catch (err) {
        console.error('Error fetching product variants:', err);
        setError('Unable to load product options: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProductVariants();
  }, [product]);

  // Parse original variant options from the provided product prop
  useEffect(() => {
    if (product && product.variant_title) {
      // Parse the variant title (e.g., "M / Red / Cotton")
      const parts = product.variant_title.split(' / ');
      
      // For simplicity, assume:
      // - first part is size,
      // - second part is color,
      // - any additional parts are other options.
      const originalOpts = {
        size: parts[0] || '',
        color: parts[1] || '',
        other: {}
      };
      
      // Handle additional option types if any exist
      if (parts.length > 2 && Object.keys(otherOptions).length > 0) {
        const otherKeys = Object.keys(otherOptions);
        parts.slice(2).forEach((value, index) => {
          if (index < otherKeys.length) {
            originalOpts.other[otherKeys[index]] = value;
          }
        });
      }
      
      setOriginalOptions(originalOpts);
      
      // Initialize selections with the original values
      setSelectedSize(originalOpts.size);
      setSelectedColor(originalOpts.color);
      setSelectedOtherOptions(originalOpts.other);
    }
  }, [product, otherOptions]);

  // Find the matching variant when selections change and notify parent
  useEffect(() => {
    if (!variants.length || !selectedSize) return;
    
    // Filter variants based on selected size (and optionally color)
    const matchingVariants = variants.filter(variant => 
      variant.option1 === selectedSize && 
      (selectedColor ? variant.option2 === selectedColor : true)
    );
    
    // Pick the first available variant or fallback to the first match
    const availableVariant = matchingVariants.find(v => v.isAvailable) || matchingVariants[0];
    
    // Only update if the variant is different
    if (availableVariant !== selectedVariant) {
      setSelectedVariant(availableVariant);
      
      // Notify the parent component of the exchange details change
      if (onExchangeDetailsChange) {
        onExchangeDetailsChange({
          productData, // full product data for Shopify actions
          variantId: availableVariant?.id || product.variant_id,
          originalSize: originalOptions.size,
          newSize: selectedSize,
          originalColor: originalOptions.color,
          newColor: selectedColor,
          isInStock: availableVariant?.isAvailable || false,
          inventory: availableVariant?.inventory || 0
        });
      }
    }
  }, [
    variants, 
    selectedSize, 
    selectedColor, 
    originalOptions, 
    product, 
    onExchangeDetailsChange,
    selectedVariant,
    productData
  ]);

  // Render loading state
  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading product options...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
          <div>
            <p className="font-medium text-red-800">Unable to load exchange options</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <p className="text-sm text-red-600 mt-2">
              Please proceed with a regular return instead, or contact customer support for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render a message if no exchange options are available
  if ((!sizeOptions.length && !colorOptions.length) || !variants.length) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 mr-2" />
          <div>
            <p className="font-medium text-yellow-800">No exchange options available</p>
            <p className="text-sm text-yellow-600 mt-1">
              This product does not have any variants in stock for exchange.
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              Please proceed with a regular return instead, or contact customer support for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="font-medium text-gray-900 mb-4 flex items-center">
        <RefreshCw className="w-4 h-4 mr-2 text-blue-600" />
        Select Exchange Options
      </h3>
      
      {/* Size selection */}
      {sizeOptions.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Size
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {sizeOptions.map(size => (
              <button
                key={size}
                type="button"
                className={`
                  py-2 px-3 border rounded-md text-sm font-medium
                  ${selectedSize === size 
                    ? 'bg-blue-100 border-blue-500 text-blue-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                  ${originalOptions.size === size ? 'relative' : ''}
                `}
                onClick={() => setSelectedSize(size)}
              >
                {size}
                {originalOptions.size === size && (
                  <span className="absolute -top-2 -right-2 text-xs bg-gray-100 px-1 rounded-full border border-gray-300">
                    Current
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Color selection */}
      {colorOptions.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {colorOptions.map(color => (
              <button
                key={color}
                type="button"
                className={`
                  py-2 px-3 border rounded-md text-sm font-medium
                  ${selectedColor === color 
                    ? 'bg-blue-100 border-blue-500 text-blue-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                  ${originalOptions.color === color ? 'relative' : ''}
                `}
                onClick={() => setSelectedColor(color)}
              >
                {color}
                {originalOptions.color === color && (
                  <span className="absolute -top-2 -right-2 text-xs bg-gray-100 px-1 rounded-full border border-gray-300">
                    Current
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Other options */}
      {Object.keys(otherOptions).length > 0 && (
        <>
          {Object.entries(otherOptions).map(([key, option]) => (
            <div key={key} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {option.name}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {option.values.map(value => (
                  <button
                    key={value}
                    type="button"
                    className={`
                      py-2 px-3 border rounded-md text-sm font-medium
                      ${selectedOtherOptions[key] === value 
                        ? 'bg-blue-100 border-blue-500 text-blue-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                      ${originalOptions.other[key] === value ? 'relative' : ''}
                    `}
                    onClick={() => setSelectedOtherOptions({
                      ...selectedOtherOptions,
                      [key]: value
                    })}
                  >
                    {value}
                    {originalOptions.other[key] === value && (
                      <span className="absolute -top-2 -right-2 text-xs bg-gray-100 px-1 rounded-full border border-gray-300">
                        Current
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      
      {/* Inventory Status */}
      <div className={`
        mt-4 p-3 rounded border
        ${selectedVariant && selectedVariant.isAvailable 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'}
      `}>
        {selectedVariant ? (
          <>
            {selectedVariant.isAvailable ? (
              <p className="text-sm font-medium text-green-800 flex items-center">
                <Check className="w-4 h-4 mr-1 text-green-500" />
                In Stock ({selectedVariant.inventory} available)
              </p>
            ) : (
              <p className="text-sm font-medium text-red-800 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Out of Stock
              </p>
            )}
          </>
        ) : (
          <p className="text-sm font-medium text-red-800 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1 text-red-500" />
            Selected combination not available
          </p>
        )}
      </div>
      
      {/* Exchange Summary */}
      <div className="mt-4 bg-white p-3 rounded border border-gray-200">
        <p className="text-sm font-medium text-gray-900">Exchange Summary</p>
        {selectedSize !== originalOptions.size && (
          <p className="text-xs text-gray-600 mt-1">
            Size: <span className="line-through">{originalOptions.size}</span> → <span className="font-medium">{selectedSize}</span>
          </p>
        )}
        {selectedColor !== originalOptions.color && (
          <p className="text-xs text-gray-600 mt-1">
            Color: <span className="line-through">{originalOptions.color}</span> → <span className="font-medium">{selectedColor}</span>
          </p>
        )}
        {Object.keys(selectedOtherOptions).map(key => {
          if (selectedOtherOptions[key] !== originalOptions.other[key]) {
            return (
              <p key={key} className="text-xs text-gray-600 mt-1">
                {key}: <span className="line-through">{originalOptions.other[key]}</span> → <span className="font-medium">{selectedOtherOptions[key]}</span>
              </p>
            );
          }
          return null;
        })}
        {selectedSize === originalOptions.size && 
         selectedColor === originalOptions.color && 
         Object.keys(selectedOtherOptions).every(key => selectedOtherOptions[key] === originalOptions.other[key]) && (
          <p className="text-xs text-gray-600 mt-1 italic">
            No changes selected. Please select a different option.
          </p>
        )}
      </div>
    </div>
  );
}
