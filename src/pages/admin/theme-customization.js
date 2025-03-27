// src/pages/admin/theme-customization.js
import React, { useState, useEffect } from 'react';
import { Save, Eye } from 'lucide-react';
import AdminLayout from '@/components/admin/Layout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAdmin } from '@/lib/context/AdminContext';

export default function ThemeCustomization() {
  const { authFetch } = useAdmin();
  const [settings, setSettings] = useState({
    primaryColor: '#4f46e5',
    secondaryColor: '#f59e0b',
    accentColor: '#10b981',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    borderColor: '#e5e7eb',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '16px',
    customCSS: '',
    logo: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

// Fetch current theme settings
useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        // First, check localStorage
        const storedTheme = localStorage.getItem('tenant-theme-default');
        if (storedTheme) {
          const parsedTheme = JSON.parse(storedTheme);
          setSettings(parsedTheme);
        }
  
        // Then fetch from server to ensure we have the latest
        const response = await authFetch('/api/admin/theme');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
          
          // Update localStorage with server data
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
  }, [authFetch]);

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
      
      // Persist to localStorage
      localStorage.setItem('tenant-theme-default', JSON.stringify(settings));
      
      // Optional: Add a visual indicator of successful save
      setMessage({ type: 'success', text: 'Theme settings saved successfully' });
      
      // Suggest page reload or provide a reload button
      // You could add a reload button next to the success message
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  // Handle field changes
  const handleChange = (field, value) => {
    setSettings({
      ...settings,
      [field]: value
    });
  };

  // Generate preview URL
  const getPreviewUrl = () => {
    const baseUrl = window.location.origin;
    const previewParams = new URLSearchParams({
      preview: 'true',
      ...settings
    });
    return `${baseUrl}?${previewParams.toString()}`;
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
            icon={<Eye className="w-4 h-4" />}
            onClick={() => window.open(getPreviewUrl(), '_blank')}
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
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
            >
                Reload Page
            </Button>
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
                  <img 
                    src={settings.logo} 
                    alt="Logo Preview" 
                    className="max-h-16 object-contain"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/150x50?text=Invalid+Image';
                    }}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Advanced CSS Section */}
          <Card title="Advanced Customization" padding="normal">
            <div>
              <label className="block text-sm font-medium text-gray-700">Custom CSS</label>
              <textarea
                value={settings.customCSS || ''}
                onChange={(e) => handleChange('customCSS', e.target.value)}
                rows={6}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 font-mono text-sm"
                placeholder={`.return-button { 
  border-radius: 4px;
  text-transform: uppercase;
}`}
              />
              <p className="mt-1 text-xs text-gray-500">
                Add custom CSS to further customize the appearance of your return portal
              </p>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}