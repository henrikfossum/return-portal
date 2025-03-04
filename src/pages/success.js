// src/pages/success.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import Layout from '@/components/ui/Layout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function Success() {
  const router = useRouter();
  
  // Handle return to home button
  const handleReturnHome = () => {
    router.push('/');
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto p-4">
        <Card
          padding="large"
          elevation="medium"
          className="mt-10"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Request Submitted</h1>
            <p className="text-gray-600">Your return/exchange request has been successfully submitted.</p>
          </div>
          
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <h3 className="font-medium text-gray-900 flex items-center">
              <ShoppingBag className="w-4 h-4 mr-2 text-gray-600" />
              Next Steps
            </h3>
            
            <ol className="space-y-3 pl-6 list-decimal">
              <li className="text-gray-700 text-sm">
                <span className="font-medium">Check your email</span>
                <p className="mt-1 text-gray-500">
                  You'll receive a confirmation email with details about your request.
                </p>
              </li>
              
              <li className="text-gray-700 text-sm">
                <span className="font-medium">Print return label</span>
                <p className="mt-1 text-gray-500">
                  The email will include a return shipping label that you can print.
                </p>
              </li>
              
              <li className="text-gray-700 text-sm">
                <span className="font-medium">Pack and ship your return</span>
                <p className="mt-1 text-gray-500">
                  Pack the items securely and attach the return label to the package.
                </p>
              </li>
              
              <li className="text-gray-700 text-sm">
                <span className="font-medium">Track your return</span>
                <p className="mt-1 text-gray-500">
                  You can use the tracking number provided in the email to monitor your return status.
                </p>
              </li>
            </ol>
          </div>
          
          <Button
            onClick={handleReturnHome}
            variant="primary"
            fullWidth
            size="lg"
            icon={<ArrowRight className="w-5 h-5" />}
            iconPosition="right"
          >
            Return to Home
          </Button>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              If you have any questions, please contact our customer support.
            </p>
            <a href="mailto:support@example.com" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
              support@example.com
            </a>
          </div>
        </Card>
      </div>
    </Layout>
  );
}