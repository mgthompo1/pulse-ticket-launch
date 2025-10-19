import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { captureError, addBreadcrumb } from '@/lib/sentry';
import * as Sentry from '@sentry/react';

export default function SentryTest() {
  const testSimpleError = () => {
    console.log('🧪 Testing simple error...');
    try {
      throw new Error('Test error from Sentry Test Page');
    } catch (error) {
      console.log('📤 Sending error to Sentry:', error);
      const eventId = Sentry.captureException(error);
      console.log('✅ Sentry Event ID:', eventId);
      alert(`Error sent to Sentry!\nEvent ID: ${eventId}\n\nCheck your Sentry dashboard at https://sentry.io`);
    }
  };

  const testErrorWithContext = () => {
    try {
      throw new Error('Payment processing failed - test error');
    } catch (error) {
      captureError(error as Error, {
        tags: {
          category: 'payment',
          payment_type: 'stripe',
          organization_id: 'test-org-123',
        },
        extra: {
          orderId: 'test-order-456',
          amount: 99.99,
          currency: 'USD',
        },
        level: 'error',
      });
      alert('Error with context sent to Sentry! Check your Sentry dashboard.');
    }
  };

  const testCriticalError = () => {
    addBreadcrumb('payment', 'User clicked Pay Now button', {
      orderId: 'test-789',
      amount: 149.99,
    });

    try {
      throw new Error('CRITICAL: Database connection lost during payment');
    } catch (error) {
      captureError(error as Error, {
        tags: {
          category: 'payment',
          severity: 'critical',
          function_name: 'create-payment-intent',
        },
        level: 'critical',
      });
      alert('Critical error sent to Sentry! You should get an alert notification.');
    }
  };

  const testErrorBoundary = () => {
    // This will be caught by the error boundary
    throw new Error('Error Boundary Test - This should show the error fallback UI');
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Sentry Error Monitoring Test</CardTitle>
          <CardDescription>
            Test different types of errors to verify Sentry is working correctly.
            <br />
            <strong>Current Mode:</strong> {import.meta.env.MODE}
            <br />
            <strong>Sentry Enabled:</strong> {import.meta.env.MODE === 'production' ? '✅ Yes' : '❌ No (production only)'}
            <br />
            <strong>Sentry DSN Configured:</strong> {import.meta.env.VITE_SENTRY_DSN ? '✅ Yes' : '❌ No'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {import.meta.env.MODE !== 'production' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Note:</strong> Sentry is disabled in development mode by default.
                <br />
                To test in development, temporarily change <code>enabled: true</code> in <code>src/lib/sentry.ts</code>
                <br />
                Or deploy to production/staging to test live.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold">Test Error Types:</h3>

            <Button
              onClick={testSimpleError}
              variant="outline"
              className="w-full"
            >
              1. Test Simple Error
            </Button>

            <Button
              onClick={testErrorWithContext}
              variant="outline"
              className="w-full"
            >
              2. Test Error with Context (Payment Error)
            </Button>

            <Button
              onClick={testCriticalError}
              variant="destructive"
              className="w-full"
            >
              3. Test Critical Error (Should Alert)
            </Button>

            <Button
              onClick={testErrorBoundary}
              variant="destructive"
              className="w-full"
            >
              4. Test Error Boundary (Will crash this page)
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-2">How to Verify:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>Click one of the test buttons above</li>
              <li>Go to your Sentry dashboard: <a href="https://sentry.io" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">sentry.io</a></li>
              <li>Navigate to Issues → All Issues</li>
              <li>You should see the test error appear within seconds</li>
              <li>Click on the error to see full details, context, and tags</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Sentry Configuration</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• DSN: {import.meta.env.VITE_SENTRY_DSN ? '✅ Configured' : '❌ Missing'}</li>
              <li>• Version: {import.meta.env.VITE_APP_VERSION || '1.0.0'}</li>
              <li>• Environment: {import.meta.env.MODE}</li>
              <li>• Traces Sample Rate: 10%</li>
              <li>• Session Replay: 100% on errors</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
