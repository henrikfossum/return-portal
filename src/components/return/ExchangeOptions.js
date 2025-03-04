// src/components/return/ExchangeOptions.js
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function ExchangeOptions({ 
  product, 
  onExchangeDetailsChange,
  initialDetails = null
}) {
  // State for loading and error handling
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for product data
  const [productData, setProductData] = useState(null);
  const [variants, setVariants] = useState([]);
  
  // State for option types and values
  const [optionTypes, setOptionTypes] = useState([]);
  const [sizeOptions, setSizeOptions] = useState([]);
  const [colorOptions, setColorOptions] = useState([]);
  const [otherOptions, setOtherOptions] = useState({});
  
  // State for current selections
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

  // Fetch product variants when component mounts
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
          throw new Error('Failed to fetch product variants');
        }
        
        const data = await response.json();
        setProductData(data);
        
        // Process variants
        if (data.variants) {
          setVariants(data.variants);
        }
        
        // Process options
        if (data.options) {
          // Get option types
          const types = data.options.map(option => ({
            id: option.id,
            name: option.name,
            position: option.position
          }));
          setOptionTypes(types);
          
          // Find size and color options (common patterns)
          const sizeOptionNames = ['size', 'sizes', 'length', 'width', 'dimension'];
          const colorOptionNames = ['color', 'colours', 'colors', 'shade', 'pattern'];
          
          // Extract size options
          const sizeOption = data.options.find(option => 
            sizeOptionNames.includes(option.name.toLowerCase())
          );
          
          if (sizeOption) {
            const inStockSizes = data.inStockOptions[sizeOption.name.toLowerCase()] || [];
            setSizeOptions(inStockSizes);
          }
          
          // Extract color options
          const colorOption = data.options.find(option => 
            colorOptionNames.includes(option.name.toLowerCase())
          );
          
          if (colorOption) {
            const inStockColors = data.inStockOptions[colorOption.name.toLowerCase()] || [];
            setColorOptions(inStockColors);
          }
          
          // Handle other option types
          const otherOptionTypes = data.options.filter(option => 
            !sizeOptionNames.includes(option.name.toLowerCase()) && 
            !colorOptionNames.includes(option.name.toLowerCase())
          );
          
          if (otherOptionTypes.length > 0) {
            const otherOpts = {};
            otherOptionTypes.forEach(option => {
              const optionName = option.name.toLowerCase();
              otherOpts[optionName] = {
                id: option.id,
                name: option.name,
                values: data.inStockOptions[optionName] || []
              };
            });
            setOtherOptions(otherOpts);
          }
        }
      } catch (err) {
        console.error('Error fetching product variants:', err);
        setError('Unable to load product options. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProductVariants();
  }, [product]);

  // Parse original variant options
  useEffect(() => {
    if (product && product.variant_title) {
      // Parse the variant title to extract current options
      const parts = product.variant_title.split(' / ');
      
      // For simplicity, we assume first part is size, second is color
      // In a full implementation, you'd match these to the actual option names
      const originalOpts = {
        size: parts[0] || '',
        color: parts[1] || '',
        other: {}
      };
      
      // Handle additional option types if any
      if (parts.length > 2 && Object.keys(otherOptions).length > 0) {
        const otherKeys = Object.keys(otherOptions);
        parts.slice(2).forEach((value, index) => {
          if (index < otherKeys.length) {
            originalOpts.other[otherKeys[index]] = value;
          }
        });
      }
      
      setOriginalOptions(originalOpts);
      
      // Initialize selections with original values
      setSelectedSize(originalOpts.size);
      setSelectedColor(originalOpts.color);
      setSelectedOtherOptions(originalOpts.other);
    }
  }, [product, otherOptions]);

  // Find the matching variant when selections change
  useEffect(() => {
    if (!variants.length || !selectedSize || !selectedColor) return;
    
    // Construct the full variant title based on selections
    let variantTitle = [selectedSize, selectedColor];
    
    // Add other options in the correct order
    Object.keys(selectedOtherOptions).forEach(key => {
      if (selectedOtherOptions[key]) {
        variantTitle.push(selectedOtherOptions[key]);
      }
    });
    
    variantTitle = variantTitle.join(' / ');
    
    // Find the matching variant
    const matchingVariant = variants.find(v => v.title === variantTitle);
    
    setSelectedVariant(matchingVariant);
    
    // Update exchange details for the parent component
    if (onExchangeDetailsChange) {
      onExchangeDetailsChange({
        variantId: matchingVariant?.id || product.variant_id,
        originalSize: originalOptions.size,
        newSize: selectedSize,
        originalColor: originalOptions.color,
        newColor: selectedColor,
        isInStock: matchingVariant?.isAvailable || false,
        inventory: matchingVariant?.inventory || 0
      });
    }
  }, [variants, selectedSize, selectedColor, selectedOtherOptions, originalOptions, product, onExchangeDetailsChange]);

  // Loading state
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

  // Error state
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

  // No available options
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
      
      {/* Size selection - only if there are size options */}
      {sizeOptions.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Size
          </label>
          <div className="grid grid-cols-4 gap-2">
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
      
      {/* Color selection - only if there are color options */}
      {colorOptions.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color
          </label>
          <div className="grid grid-cols-3 gap-2">
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
      
      {/* Other options - if any */}
      {Object.keys(otherOptions).length > 0 && (
        <>
          {Object.entries(otherOptions).map(([key, option]) => (
            <div key={key} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {option.name}
              </label>
              <div className="grid grid-cols-3 gap-2">
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
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                In Stock ({selectedVariant.inventory} available)
              </p>
            ) : (
              <p className="text-sm font-medium text-red-800 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Out of Stock
              </p>
            )}
          </>
        ) : (
          <p className="text-sm font-medium text-red-800 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            Selected combination not available
          </p>
        )}
      </div>
      
      {/* Summary */}
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