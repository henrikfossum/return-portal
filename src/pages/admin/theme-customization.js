// src/pages/admin/theme-customization.js - Enhanced with better theme application
import React, { useState, useEffect } from 'react';
import { Save, Eye, RefreshCw } from 'lucide-react';
import AdminLayout from '@/components/admin/Layout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAdmin } from '@/lib/context/AdminContext';
import { useTheme } from '@/lib/context/ThemeContext';
import Image from 'next/image';

export default function ThemeCustomization() {
  const { authFetch } = useAdmin();
  const { theme: currentTheme, updateTheme, loadTheme } = useTheme();
  
  const [settings, setSettings] = useState({
    primaryColor: '#4f46e5',
    secondaryColor: '#f59e0b',
    accentColor: '#10b981',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    secondaryTextColor: '#6b7280',
    borderColor: '#e5e7eb',
    fontFamily: 'Inter, system-ui, sans-serif',
    headingFontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '16px',
    customCSS: '',
    logo: null
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Use the theme context to load settings
  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        // First, load from theme context
        if (currentTheme) {
          setSettings(currentTheme);
        }
  
        // Then fetch from server to ensure we have the latest
        const response = await authFetch('/api/admin/theme');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
          
          // Update theme context with server data
          updateTheme(data);
          
          // Also update localStorage manually for backward compatibility
          localStorage.setItem('tenant-theme-default', JSON.stringify(data));
        } else {
          throw new Error('Failed to load theme settings');
        }
      } catch (error) {
        console.error('Error loading theme settings:', error);
        setMessage({ type: 'error', text: 'Failed to load settings' });
      } finally {
        setLoading(false);
      }
    }
    
    loadSettings();
  }, [authFetch, currentTheme, updateTheme]);

  // Apply theme changes in real-time as user modifies settings
  useEffect(() => {
    // Skip initial render
    if (loading) return;
    
    // Apply theme changes in real-time without saving to server
    updateTheme(settings);
  }, [settings, loading, updateTheme]);

  // Handle saving settings
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await authFetch('/api/admin/theme', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      // Update both contexts and localStorage
      updateTheme(settings);
      localStorage.setItem('tenant-theme-default', JSON.stringify(settings));
      
      // Show success message
      setMessage({ type: 'success', text: 'Theme settings saved successfully' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  // Handle field changes
  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Reset to defaults
  const handleReset = () => {
    setSettings({
      primaryColor: '#4f46e5',
      secondaryColor: '#f59e0b',
      accentColor: '#10b981',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      secondaryTextColor: '#6b7280',
      borderColor: '#e5e7eb',
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '16px',
      customCSS: '',
      logo: null
    });
  };

  // Generate preview URL
  const handlePreview = () => {
    // Open preview in new window
    const baseUrl = window.location.origin;
    const previewParams = new URLSearchParams({
      preview: 'true',
      tenantId: 'preview'
    });
    
    // Store preview settings in localStorage for the preview window to access
    localStorage.setItem('tenant-theme-preview', JSON.stringify(settings));
    
    window.open(`${baseUrl}?${previewParams.toString()}`, '_blank');
    setPreviewOpen(true);
  };

  return (
    <AdminLayout title="Theme Customization">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Theme Customization</h2>
          <p className="text-sm text-gray-500">Customize the appearance of your return portal</p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={handleReset}
          >
            Reset
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            icon={<Eye className="w-4 h-4" />}
            onClick={handlePreview}
          >
            Preview
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSave}
            isLoading={saving}
          >
            Save Changes
          </Button>
        </div>
      </div>
      
      {message && (
        <div 
            className={`mb-6 p-4 rounded-md flex justify-between items-center ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
        >
            <span>{message.text}</span>
            {message.type === 'success' && (
              <div className="space-x-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.location.reload()}
                >
                    Reload Page
                </Button>
                {previewOpen && (
                  <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={handlePreview}
                  >
                      Update Preview
                  </Button>
                )}
              </div>
            )}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Colors Section */}
          <Card title="Colors" padding="normal">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Primary Color</label>
                <div className="flex mt-1">
                  <input 
                    type="color" 
                    value={settings.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="h-9 w-9 rounded-l border border-r-0 border-gray-300"
                  />
                  <input 
                    type="text" 
                    value={settings.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="flex-1 rounded-r border border-gray-300 px-3"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Used for buttons and primary elements</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Secondary Color</label>
                <div className="flex mt-1">
                  <input 
                    type="color" 
                    value={settings.secondaryColor}
                    onChange={(e) => handleChange('secondaryColor', e.target.value)}
                    className="h-9 w-9 rounded-l border border-r-0 border-gray-300"
                  />
                  <input 
                    type="text" 
                    value={settings.secondaryColor}
                    onChange={(e) => handleChange('secondaryColor', e.target.value)}
                    className="flex-1 rounded-r border border-gray-300 px-3"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Used for secondary buttons and accents</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Background Color</label>
                <div className="flex mt-1">
                  <input 
                    type="color" 
                    value={settings.backgroundColor}
                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                    className="h-9 w-9 rounded-l border border-r-0 border-gray-300"
                  />
                  <input 
                    type="text" 
                    value={settings.backgroundColor}
                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                    className="flex-1 rounded-r border border-gray-300 px-3"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Background color for the return portal</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Text Color</label>
                <div className="flex mt-1">
                  <input 
                    type="color" 
                    value={settings.textColor}
                    onChange={(e) => handleChange('textColor', e.target.value)}
                    className="h-9 w-9 rounded-l border border-r-0 border-gray-300"
                  />
                  <input 
                    type="text" 
                    value={settings.textColor}
                    onChange={(e) => handleChange('textColor', e.target.value)}
                    className="flex-1 rounded-r border border-gray-300 px-3"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Main text color</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Secondary Text Color</label>
                <div className="flex mt-1">
                  <input 
                    type="color" 
                    value={settings.secondaryTextColor}
                    onChange={(e) => handleChange('secondaryTextColor', e.target.value)}
                    className="h-9 w-9 rounded-l border border-r-0 border-gray-300"
                  />
                  <input 
                    type="text" 
                    value={settings.secondaryTextColor}
                    onChange={(e) => handleChange('secondaryTextColor', e.target.value)}
                    className="flex-1 rounded-r border border-gray-300 px-3"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Used for subtitles and less important text</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Border Color</label>
                <div className="flex mt-1">
                  <input 
                    type="color" 
                    value={settings.borderColor}
                    onChange={(e) => handleChange('borderColor', e.target.value)}
                    className="h-9 w-9 rounded-l border border-r-0 border-gray-300"
                  />
                  <input 
                    type="text" 
                    value={settings.borderColor}
                    onChange={(e) => handleChange('borderColor', e.target.value)}
                    className="flex-1 rounded-r border border-gray-300 px-3"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Color for borders and dividers</p>
              </div>
            </div>
          </Card>

          {/* Typography Section */}
          <Card title="Typography" padding="normal">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Font Family</label>
                <select
                  value={settings.fontFamily}
                  onChange={(e) => handleChange('fontFamily', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3"
                >
                  <option value="Inter, system-ui, sans-serif">Inter (Default)</option>
                  <option value="'Roboto', sans-serif">Roboto</option>
                  <option value="'Open Sans', sans-serif">Open Sans</option>
                  <option value="'Lato', sans-serif">Lato</option>
                  <option value="'Montserrat', sans-serif">Montserrat</option>
                  <option value="'Poppins', sans-serif">Poppins</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Main font for the entire portal</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Heading Font Family</label>
                <select
                  value={settings.headingFontFamily}
                  onChange={(e) => handleChange('headingFontFamily', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3"
                >
                  <option value={settings.fontFamily}>Same as Main Font</option>
                  <option value="Inter, system-ui, sans-serif">Inter</option>
                  <option value="'Roboto', sans-serif">Roboto</option>
                  <option value="'Open Sans', sans-serif">Open Sans</option>
                  <option value="'Lato', sans-serif">Lato</option>
                  <option value="'Montserrat', sans-serif">Montserrat</option>
                  <option value="'Poppins', sans-serif">Poppins</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Font for headings and titles</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Font Size</label>
                <select
                  value={settings.fontSize}
                  onChange={(e) => handleChange('fontSize', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3"
                >
                  <option value="14px">Small (14px)</option>
                  <option value="16px">Medium (16px)</option>
                  <option value="18px">Large (18px)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Base font size for text</p>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
                <h3 className="text-sm font-medium mb-2">Typography Preview</h3>
                <div style={{ 
                  fontFamily: settings.fontFamily,
                  fontSize: settings.fontSize,
                  color: settings.textColor
                }}>
                  <h4 style={{ 
                    fontFamily: settings.headingFontFamily,
                    color: settings.primaryColor,
                    fontSize: '1.25rem',
                    marginBottom: '0.5rem'
                  }}>
                    Heading Example
                  </h4>
                  <p className="mb-2">This is how your main text will appear to customers.</p>
                  <p style={{ color: settings.secondaryTextColor, fontSize: '0.875rem' }}>
                    This is secondary text using your chosen colors.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Logo Section */}
          <Card title="Logo & Branding" padding="normal">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Logo URL</label>
                <input
                  type="text"
                  value={settings.logo || ''}
                  onChange={(e) => handleChange('logo', e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3"
                />
                <p className="mt-1 text-xs text-gray-500">Enter the URL to your company logo</p>
              </div>
              
              {settings.logo && (
                <div className="mt-2 p-4 bg-gray-50 rounded-md">
                  <p className="text-sm mb-2">Logo Preview:</p>
                  <div className="relative h-16 w-full flex items-center justify-center bg-white rounded border border-gray-200 p-2">
                    <Image 
                      src={settings.logo} 
                      alt="Logo Preview"
                      width={150}
                      height={50}
                      className="max-h-12 object-contain"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22150%22%20height%3D%2250%22%20viewBox%3D%220%200%20150%2050%22%3E%3Crect%20fill%3D%22%23ddd%22%20width%3D%22150%22%20height%3D%2250%22%2F%3E%3Ctext%20fill%3D%22%23666%22%20font-family%3D%22sans-serif%22%20font-size%3D%2212%22%20dy%3D%220.3em%22%20text-anchor%3D%22middle%22%20x%3D%2275%22%20y%3D%2225%22%3EInvalid%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Logo Width</label>
                <input
                  type="text"
                  value={settings.logoWidth || '120px'}
                  onChange={(e) => handleChange('logoWidth', e.target.value)}
                  placeholder="120px"
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3"
                />
                <p className="mt-1 text-xs text-gray-500">Maximum width of your logo (e.g. 120px or 10rem)</p>
              </div>
            </div>
          </Card>

          {/* Advanced CSS Section */}
          <Card title="Advanced Customization" padding="normal">
            <div>
              <label className="block text-sm font-medium text-gray-700">Custom CSS</label>
              <textarea
                value={settings.customCSS || ''}
                onChange={(e) => handleChange('customCSS', e.target.value)}
                rows={8}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 font-mono text-sm"
                placeholder={`.return-portal-container {
  /* Custom styles for the main container */
}

.return-portal-heading {
  /* Custom styles for headings */
}

.return-portal-button-primary {
  /* Custom styles for primary buttons */
}`}
              />
              <p className="mt-1 text-xs text-gray-500">
                Add custom CSS to further customize the appearance of your return portal.
                Target elements using the <code>.return-portal-</code> class prefix.
              </p>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}