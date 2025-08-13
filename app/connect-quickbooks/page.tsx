'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ConnectQuickBooksContent() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const searchParams = useSearchParams();

  // Check for error or success parameters from OAuth callback
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const success = searchParams.get('success');
    const companyId = searchParams.get('companyId');
    
    if (error) {
      setConnectionStatus('error');
      setStatusMessage(decodeURIComponent(message || 'Connection failed'));
    } else if (success === 'true' && companyId) {
      setConnectionStatus('success');
      setStatusMessage('QuickBooks connected successfully!');
      setCompanyInfo({
        companyId: companyId,
        tokenType: 'Bearer',
        obtainedAt: new Date().toISOString()
      });
    }
  }, [searchParams]);

  const handleConnectClick = async () => {
    try {
      setIsConnecting(true);
      setConnectionStatus('connecting');
      setStatusMessage('Redirecting to QuickBooks...');

      // Direct redirect to OAuth endpoint (it will redirect to QuickBooks)
      window.location.href = '/api/auth/quickbooks';
    } catch (error) {
      setConnectionStatus('error');
      setStatusMessage('Failed to initiate connection: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setIsConnecting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Connect QuickBooks</h1>
            </div>
            <div className="flex items-center">
              <a
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect to QuickBooks</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Link your QuickBooks account to automatically sync financial data and generate comprehensive KPI reports.
            </p>
          </div>

          {/* Status Display */}
          {connectionStatus !== 'idle' && (
            <div className={`mb-6 p-4 rounded-lg ${
              connectionStatus === 'error' 
                ? 'bg-red-50 text-red-800 border border-red-200'
                : connectionStatus === 'connecting'
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}>
              <div className="flex items-center">
                {connectionStatus === 'connecting' && (
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {connectionStatus === 'error' && (
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {connectionStatus === 'success' && (
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="font-medium">{statusMessage}</span>
              </div>
            </div>
          )}

          {/* Company Information Display */}
          {companyInfo && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-3">✅ QuickBooks Connected Successfully!</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Company ID:</strong> 
                  <code className="ml-2 px-2 py-1 bg-white border rounded font-mono text-xs">
                    {companyInfo.companyId}
                  </code>
                  <button
                    onClick={() => copyToClipboard(companyInfo.companyId)}
                    className="ml-2 text-green-600 hover:text-green-800 underline"
                  >
                    Copy
                  </button>
                </div>
                <div><strong>Token Type:</strong> {companyInfo.tokenType}</div>
                <div><strong>Connected At:</strong> {companyInfo.obtainedAt}</div>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>📝 Next Steps:</strong> Copy the Company ID above and update your <code>.env.local</code> file:
                </p>
                <code className="block mt-2 p-2 bg-gray-900 text-green-400 rounded text-xs">
                  QB_COMPANY_ID={companyInfo.companyId}
                </code>
              </div>
            </div>
          )}

          {/* Connection Instructions */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 What happens when you connect:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">1.</span>
                  You'll be redirected to QuickBooks to authorize access
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">2.</span>
                  Select your company and approve permissions
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">3.</span>
                  You'll be redirected back with your Company ID
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">4.</span>
                  Copy the Company ID to complete setup
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">🔐 Permissions requested:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <svg className="h-4 w-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Read financial reports and statements
                </li>
                <li className="flex items-start">
                  <svg className="h-4 w-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Access customer and vendor data
                </li>
                <li className="flex items-start">
                  <svg className="h-4 w-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Read sales and expense transactions
                </li>
                <li className="flex items-start">
                  <svg className="h-4 w-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Generate automated KPI reports
                </li>
              </ul>
            </div>
          </div>

          {/* Connect Button */}
          <div className="text-center">
            <button
              onClick={handleConnectClick}
              disabled={isConnecting}
              className={`inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white ${
                isConnecting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Connect to QuickBooks
                </>
              )}
            </button>
          </div>

          {/* Environment Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center text-sm text-gray-500">
              <p>
                <strong>Environment:</strong> Production QuickBooks • 
                <strong> Status:</strong> {process.env.NODE_ENV === 'development' ? 'Development' : 'Production'} Mode
              </p>
              <p className="mt-1">
                Your data is transmitted securely using OAuth2 encryption.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ConnectQuickBooksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <ConnectQuickBooksContent />
    </Suspense>
  );
}