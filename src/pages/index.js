// src/pages/index.js
import { useState } from 'react';
import { Box, Search } from 'lucide-react';
import { useReturnFlow } from '@/hooks/useReturnFlow';
import { useTenantTheme } from '@/lib/tenant/hooks';
import Layout from '@/components/ui/Layout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function Home() {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const { loading, error, lookupOrder } = useReturnFlow();
  const { theme } = useTenantTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await lookupOrder(orderId, email);
    } catch (err) {
      // Error is already handled in the hook
      console.error('Error looking up order:', err);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto p-4">
        <Card
          title="Start Your Return"
          subtitle="Please enter your order details below"
          padding="large"
          elevation="medium"
          className="mt-8"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
              <Box style={{ color: theme?.primaryColor }} className="w-8 h-8" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="orderId" className="block text-sm font-medium text-gray-700 mb-2">
                  Order ID
                </label>
                <input
                  type="text"
                  id="orderId"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full px-4 h-12 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                  placeholder="Enter your order ID"
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 h-12 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                  placeholder="Enter your email address"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={loading}
              icon={<Search className="w-4 h-4" />}
              disabled={!orderId || !email}
            >
              {loading ? 'Looking Up Order...' : 'Look Up Order'}
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  );
}