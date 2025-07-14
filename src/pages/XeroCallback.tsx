import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const XeroCallback = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      // Send error to parent window
      window.opener?.postMessage({
        type: 'XERO_AUTH_ERROR',
        error: error
      }, '*');
    } else if (code && state) {
      // Send success to parent window
      window.opener?.postMessage({
        type: 'XERO_AUTH_SUCCESS',
        code: code,
        state: state
      }, '*');
    }

    // Close the popup
    window.close();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Completing Xero connection...</p>
      </div>
    </div>
  );
};

export default XeroCallback;