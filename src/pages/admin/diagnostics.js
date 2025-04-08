// src/pages/admin/diagnostics.js
import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/Layout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAdmin } from '@/lib/context/AdminContext';
import { AlertCircle, Check, Database, RefreshCw, HardDrive, List } from 'lucide-react';

export default function DatabaseDiagnostics() {
  const { authFetch } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [testReturnResult, setTestReturnResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const checkDatabaseStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authFetch('/api/admin/db-health');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to check database status');
      }
      
      const data = await response.json();
      setDbStatus(data);
    } catch (err) {
      console.error('Error checking database status:', err);
      setError(err.message || 'An error occurred while checking database status');
    } finally {
      setLoading(false);
    }
  };

  // Create a test return
  const createTestReturn = async () => {
    setTestLoading(true);
    try {
      // Simple test return data
      const testData = {
        orderId: 'TEST-' + Date.now(),
        orderNumber: 'TEST-' + Date.now(),
        shopifyOrderId: 'shopify-' + Date.now(),
        customer: {
          name: 'Test Customer',
          email: 'test@example.com'
        },
        status: 'pending',
        items: [{
          id: 'item-' + Date.now(),
          title: 'Test Item',
          variant_title: 'Test Variant',
          price: 19.99,
          quantity: 1,
          returnOption: 'return',
          returnReason: {
            reason: 'Test',
            additionalInfo: 'Test return for database diagnostics'
          }
        }],
        tenantId: 'default'
      };

      // Call the API
      const response = await authFetch('/api/admin/test-return', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create test return');
      }

      const result = await response.json();
      setTestReturnResult(result);
    } catch (err) {
      console.error('Error creating test return:', err);
      setTestReturnResult({
        error: true,
        message: err.message || 'An error occurred'
      });
    } finally {
      setTestLoading(false);
    }
  };
  
  // Load database status on mount
  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  return (
    <AdminLayout title="Database Diagnostics">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Database Diagnostics</h2>
        <p className="text-sm text-gray-500">Check database connectivity and model configuration</p>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error Checking Database Status</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status Card */}
      <Card title="Database Connection" padding="normal" className="mb-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Checking database connection...</span>
          </div>
        ) : dbStatus ? (
          <div>
            <div className="flex items-center mb-4">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                dbStatus.connection.connected ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {dbStatus.connection.connected ? (
                  <Check className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {dbStatus.connection.connected ? 'Connected' : 'Disconnected'}
                </h3>
                <p className="text-sm text-gray-500">
                  {dbStatus.connection.connected 
                    ? `Connected to ${dbStatus.connection.database} database` 
                    : 'Database not connected'}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Connection Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Status:</span> {dbStatus.connection.stateText}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Database:</span> {dbStatus.connection.database}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Host:</span> {dbStatus.connection.host}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Environment:</span> {dbStatus.environment.node_env}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">MONGODB_URI:</span> {dbStatus.environment.mongodb_uri_exists ? 'Set' : 'Not Set'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Models Count:</span> {Object.keys(dbStatus.models || {}).length}
                  </p>
                </div>
              </div>
            </div>

            {/* Models Information */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Models</h4>
                <button 
                  className="text-xs text-blue-600 hover:text-blue-800"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
              
              {dbStatus.models && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Model
                        </th>
                        {showDetails && (
                          <>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Collection
                            </th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Fields
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.keys(dbStatus.models).filter(key => key !== 'count').map(modelName => (
                        <tr key={modelName}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {modelName}
                          </td>
                          {showDetails && (
                            <>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {dbStatus.models[modelName]?.collectionName || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">
                                {dbStatus.models[modelName]?.schema?.length 
                                  ? `${dbStatus.models[modelName].schema.length} fields` 
                                  : '-'}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <Button
                onClick={checkDatabaseStatus}
                variant="outline"
                size="sm"
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Refresh Status
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <p>No database status information available</p>
          </div>
        )}
      </Card>

      {/* Test Return Creation */}
      <Card title="Test Return Creation" padding="normal">
        <p className="text-sm text-gray-600 mb-4">
          Create a test return to verify database connectivity and model validation
        </p>
        
        <div className="flex items-center mb-4">
          <Button
            onClick={createTestReturn}
            variant="primary"
            size="sm"
            icon={<Database className="w-4 h-4" />}
            isLoading={testLoading}
          >
            Create Test Return
          </Button>
        </div>
        
        {testReturnResult && (
          <div className={`mt-4 p-4 rounded-lg ${
            testReturnResult.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
          }`}>
            <h4 className={`text-sm font-medium ${
              testReturnResult.error ? 'text-red-800' : 'text-green-800'
            }`}>
              {testReturnResult.error ? 'Test Return Failed' : 'Test Return Created'}
            </h4>
            
            {testReturnResult.error ? (
              <p className="mt-1 text-sm text-red-700">
                {testReturnResult.message}
              </p>
            ) : (
              <div className="mt-2 text-sm text-green-700">
                <p>Return successfully created with ID: {testReturnResult.id}</p>
                {testReturnResult.details && (
                  <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
                    {JSON.stringify(testReturnResult.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}