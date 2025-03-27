// src/pages/admin/settings/index.js
import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AdminLayout from '@/components/admin/Layout';
import { useAdmin } from '@/lib/context/AdminContext';

export default function AdminSettings() {
  const { authFetch } = useAdmin();
  
  // Settings state
  const [settings, setSettings] = useState({
    returnWindowDays: 100,
    allowExchanges: true,
    requirePhotos: false,
    autoApproveReturns: true,
    notifyOnReturn: true,
    returnReasons: [
      'Defective',
      'Wrong size',
      'Changed mind',
      'Not as described',
      'Arrived too late'
    ],
    
    // Fraud prevention settings
    fraudPrevention: {
      enabled: true,
      maxReturnsPerCustomer: 3,
      maxReturnValuePercent: 80, // % of order value
      suspiciousPatterns: {
        frequentReturns: true,
        highValueReturns: true,
        noReceiptReturns: true,
        newAccountReturns: true,
        addressMismatch: true
      },
      autoFlagThreshold: 2 // Number of suspicious indicators before auto-flagging
    }
  });
  
  // Form state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [newReason, setNewReason] = useState('');
  
  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await authFetch('/api/admin/settings');
        
        if (!response.ok) {
          throw new Error('Failed to load settings');
        }
        
        const data = await response.json();
        setSettings(data);
      } catch (err) {
        console.error('Error loading settings:', err);
        setError('Failed to load settings. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    loadSettings();
  }, [authFetch]);
  
  // Save settings
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await authFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Add new return reason
  const handleAddReason = () => {
    if (!newReason.trim()) return;
    
    setSettings({
      ...settings,
      returnReasons: [...settings.returnReasons, newReason.trim()]
    });
    
    setNewReason('');
  };
  
  // Remove a return reason
  const handleRemoveReason = (index) => {
    const updatedReasons = [...settings.returnReasons];
    updatedReasons.splice(index, 1);
    
    setSettings({
      ...settings,
      returnReasons: updatedReasons
    });
  };
  
  return (
    <AdminLayout title="Settings">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500">Configure your return portal settings</p>
        </div>
        
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={saving}
          icon={<Save className="w-4 h-4" />}
        >
          Save Changes
        </Button>
      </div>
      
      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3" />
          <p className="text-green-800">Settings saved successfully.</p>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Return Policy Settings */}
        <Card title="Return Policy" padding="normal">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Return Window (days)
              </label>
              <input
                type="number"
                value={settings.returnWindowDays}
                onChange={e => setSettings({
                  ...settings,
                  returnWindowDays: parseInt(e.target.value) || 0
                })}
                min="0"
                max="365"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Number of days after delivery that customers can request a return
              </p>
            </div>
            
            <div className="flex flex-col space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowExchanges"
                  checked={settings.allowExchanges}
                  onChange={e => setSettings({
                    ...settings,
                    allowExchanges: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowExchanges" className="ml-2 block text-sm text-gray-700">
                  Allow Exchanges
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requirePhotos"
                  checked={settings.requirePhotos}
                  onChange={e => setSettings({
                    ...settings,
                    requirePhotos: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="requirePhotos" className="ml-2 block text-sm text-gray-700">
                  Require Photos for Returns
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoApproveReturns"
                  checked={settings.autoApproveReturns}
                  onChange={e => setSettings({
                    ...settings,
                    autoApproveReturns: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoApproveReturns" className="ml-2 block text-sm text-gray-700">
                  Auto-Approve Returns
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notifyOnReturn"
                  checked={settings.notifyOnReturn}
                  onChange={e => setSettings({
                    ...settings,
                    notifyOnReturn: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="notifyOnReturn" className="ml-2 block text-sm text-gray-700">
                  Email Notifications for New Returns
                </label>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Return Reasons */}
        <Card title="Return Reasons" padding="normal">
          <p className="text-sm text-gray-500 mb-4">
            Customize the reasons customers can select when returning an item
          </p>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newReason}
                onChange={e => setNewReason(e.target.value)}
                placeholder="Add a new return reason"
                className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <Button
                onClick={handleAddReason}
                disabled={!newReason.trim()}
                variant="secondary"
                size="sm"
              >
                Add
              </Button>
            </div>
            
            <div className="bg-gray-50 rounded-md border border-gray-200 p-4">
              {settings.returnReasons.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No return reasons defined</p>
              ) : (
                <ul className="space-y-2">
                  {settings.returnReasons.map((reason, index) => (
                    <li key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                      <span className="text-gray-800">{reason}</span>
                      <button
                        onClick={() => handleRemoveReason(index)}
                        className="text-red-600 hover:text-red-800"
                        aria-label="Remove reason"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
        
        {/* Fraud Prevention Settings */}
        <Card title="Fraud Prevention" padding="normal">
          <div className="space-y-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="fraudPreventionEnabled"
                checked={settings.fraudPrevention.enabled}
                onChange={e => setSettings({
                  ...settings,
                  fraudPrevention: {
                    ...settings.fraudPrevention,
                    enabled: e.target.checked
                  }
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="fraudPreventionEnabled" className="ml-2 block text-sm text-gray-700 font-medium">
                Enable Fraud Prevention
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Returns Per Customer (30 days)
                </label>
                <input
                  type="number"
                  value={settings.fraudPrevention.maxReturnsPerCustomer}
                  onChange={e => setSettings({
                    ...settings,
                    fraudPrevention: {
                      ...settings.fraudPrevention,
                      maxReturnsPerCustomer: parseInt(e.target.value) || 0
                    }
                  })}
                  min="1"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Return Value (% of order)
                </label>
                <input
                  type="number"
                  value={settings.fraudPrevention.maxReturnValuePercent}
                  onChange={e => setSettings({
                    ...settings,
                    fraudPrevention: {
                      ...settings.fraudPrevention,
                      maxReturnValuePercent: parseInt(e.target.value) || 0
                    }
                  })}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-Flag Threshold
              </label>
              <input
                type="number"
                value={settings.fraudPrevention.autoFlagThreshold}
                onChange={e => setSettings({
                  ...settings,
                  fraudPrevention: {
                    ...settings.fraudPrevention,
                    autoFlagThreshold: parseInt(e.target.value) || 0
                  }
                })}
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Number of suspicious indicators needed to automatically flag a return
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Suspicious Patterns to Monitor</h4>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="frequentReturns"
                    checked={settings.fraudPrevention.suspiciousPatterns.frequentReturns}
                    onChange={e => setSettings({
                      ...settings,
                      fraudPrevention: {
                        ...settings.fraudPrevention,
                        suspiciousPatterns: {
                          ...settings.fraudPrevention.suspiciousPatterns,
                          frequentReturns: e.target.checked
                        }
                      }
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="frequentReturns" className="ml-2 block text-sm text-gray-700">
                    Frequent Returns
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="highValueReturns"
                    checked={settings.fraudPrevention.suspiciousPatterns.highValueReturns}
                    onChange={e => setSettings({
                      ...settings,
                      fraudPrevention: {
                        ...settings.fraudPrevention,
                        suspiciousPatterns: {
                          ...settings.fraudPrevention.suspiciousPatterns,
                          highValueReturns: e.target.checked
                        }
                      }
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="highValueReturns" className="ml-2 block text-sm text-gray-700">
                    High Value Returns
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="noReceiptReturns"
                    checked={settings.fraudPrevention.suspiciousPatterns.noReceiptReturns}
                    onChange={e => setSettings({
                      ...settings,
                      fraudPrevention: {
                        ...settings.fraudPrevention,
                        suspiciousPatterns: {
                          ...settings.fraudPrevention.suspiciousPatterns,
                          noReceiptReturns: e.target.checked
                        }
                      }
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="noReceiptReturns" className="ml-2 block text-sm text-gray-700">
                    Returns Without Receipt
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="newAccountReturns"
                    checked={settings.fraudPrevention.suspiciousPatterns.newAccountReturns}
                    onChange={e => setSettings({
                      ...settings,
                      fraudPrevention: {
                        ...settings.fraudPrevention,
                        suspiciousPatterns: {
                          ...settings.fraudPrevention.suspiciousPatterns,
                          newAccountReturns: e.target.checked
                        }
                      }
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="newAccountReturns" className="ml-2 block text-sm text-gray-700">
                    Returns from New Accounts
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="addressMismatch"
                    checked={settings.fraudPrevention.suspiciousPatterns.addressMismatch}
                    onChange={e => setSettings({
                      ...settings,
                      fraudPrevention: {
                        ...settings.fraudPrevention,
                        suspiciousPatterns: {
                          ...settings.fraudPrevention.suspiciousPatterns,
                          addressMismatch: e.target.checked
                        }
                      }
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="addressMismatch" className="ml-2 block text-sm text-gray-700">
                    Shipping/Billing Address Mismatch
                  </label>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}