import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

export const ErrorFallback = ({ error, resetError }: ErrorFallbackProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-6 w-6" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            We've encountered an unexpected error. Our team has been notified and will look into it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && import.meta.env.MODE === 'development' && (
            <div className="bg-gray-100 p-3 rounded-md">
              <p className="text-sm font-mono text-gray-700 break-all">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="flex-1"
            >
              Go Home
            </Button>
            {resetError && (
              <Button
                onClick={resetError}
                className="flex-1"
              >
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
