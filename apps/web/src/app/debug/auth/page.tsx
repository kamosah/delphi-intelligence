'use client';

import { useState } from 'react';
import { Button, Card } from '@olympus/ui';
import { useClientToken } from '@/hooks/useClientToken';
import { useAuthStore } from '@/lib/stores/auth-store';
import { handleAuthError } from '@/lib/utils/auth-error-handler';

/**
 * Simple UI test page for authentication error handling
 *
 * Manual tests:
 * 1. Check token refresh on tab visibility (should only call once)
 * 2. Test auto-logout on simulated 401 error
 * 3. Verify client-side errors don't trigger logout
 * 4. Check redirect path preservation
 */
export default function AuthDebugPage() {
  const { clientToken, isLoading, error } = useClientToken();
  const { user } = useAuthStore();
  const [callLog, setCallLog] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<string>('');

  const logMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setCallLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Test 1: Simulate backend 401 error (should trigger auto-logout)
  const testBackend401Error = async () => {
    setTestResult('');
    logMessage('Testing backend 401 error...');

    const error = new Error('HTTP 401: Token has been revoked');
    await handleAuthError(error);

    logMessage('✅ Should redirect to login with "Session Expired" toast');
    setTestResult('Check if you were redirected to login page');
  };

  // Test 2: Simulate client-side error (should NOT trigger logout)
  const testClientSideError = async () => {
    setTestResult('');
    logMessage('Testing client-side error...');

    const error = new Error('Authentication required');
    await handleAuthError(error);

    logMessage('✅ Should NOT logout (error not from backend)');
    setTestResult('You should still be on this page');
  };

  // Test 3: Simulate invalid credentials error (should trigger logout)
  const testInvalidCredentials = async () => {
    setTestResult('');
    logMessage('Testing invalid credentials error...');

    const error = new Error('Invalid authentication credentials');
    await handleAuthError(error);

    logMessage('✅ Should redirect to login');
    setTestResult('Check if you were redirected to login page');
  };

  // Test 4: Monitor token refresh calls
  const monitorTokenRefresh = () => {
    setTestResult('');
    logMessage('Monitoring token refresh...');
    logMessage(
      'Switch to another tab for >4 minutes, then come back. Check console for refresh calls.'
    );
    logMessage('Expected: 1 call from QueryProvider, not 8+ calls');
    setTestResult(
      'Switch tabs and wait >4 min, then check browser console logs'
    );
  };

  return (
    <div className="w-full min-h-screen overflow-y-auto">
      <div className="container mx-auto max-w-4xl p-8 space-y-6 pb-16">
        <div>
          <h1 className="text-3xl font-bold">Auth Error Handling Test</h1>
          <p className="text-gray-600 mt-2">
            Simple UI test for authentication and auto-logout behavior
          </p>
        </div>

        {/* Current Auth State */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
          <div className="space-y-2 text-sm font-mono">
            <div>
              <span className="font-semibold">User:</span>{' '}
              {user?.email || 'Not logged in'}
            </div>
            <div>
              <span className="font-semibold">User ID:</span>{' '}
              {user?.id || 'N/A'}
            </div>
            <div>
              <span className="font-semibold">Token Status:</span>{' '}
              {isLoading
                ? 'Loading...'
                : clientToken
                  ? '✅ Valid'
                  : '❌ Missing'}
            </div>
            {error && (
              <div className="text-red-600">
                <span className="font-semibold">Error:</span>{' '}
                {error instanceof Error ? error.message : String(error)}
              </div>
            )}
            <div>
              <span className="font-semibold">Token Preview:</span>{' '}
              {clientToken ? `${clientToken.substring(0, 20)}...` : 'N/A'}
            </div>
          </div>
        </Card>

        {/* Test Buttons */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Manual Tests</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">
                Test 1: Backend 401 Error (Should Logout)
              </h3>
              <p className="text-sm text-gray-600">
                Simulates "Token has been revoked" from backend. Should trigger
                auto-logout with "Session Expired" toast and redirect to login.
              </p>
              <Button onClick={testBackend401Error} variant="destructive">
                Trigger Backend 401 Error
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">
                Test 2: Client-Side Error (Should NOT Logout)
              </h3>
              <p className="text-sm text-gray-600">
                Simulates "Authentication required" client-side error. Should
                NOT trigger logout (not a backend error).
              </p>
              <Button onClick={testClientSideError} variant="outline">
                Trigger Client-Side Error
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">
                Test 3: Invalid Credentials (Should Logout)
              </h3>
              <p className="text-sm text-gray-600">
                Simulates "Invalid authentication credentials" from backend.
                Should trigger auto-logout.
              </p>
              <Button onClick={testInvalidCredentials} variant="destructive">
                Trigger Invalid Credentials Error
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">
                Test 4: Token Refresh on Tab Visibility
              </h3>
              <p className="text-sm text-gray-600">
                Monitor token refresh calls. Should see only 1 call when tab
                becomes active after {'>'}4 min, not 8+ calls.
              </p>
              <Button onClick={monitorTokenRefresh} variant="outline">
                Monitor Token Refresh
              </Button>
            </div>
          </div>
        </Card>

        {/* Test Result */}
        {testResult && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="text-sm">
              <span className="font-semibold">Test Result:</span> {testResult}
            </div>
          </Card>
        )}

        {/* Call Log */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Event Log</h2>
            <Button onClick={() => setCallLog([])} variant="outline" size="sm">
              Clear Log
            </Button>
          </div>
          <div className="bg-gray-900 rounded p-4 h-64 overflow-y-auto">
            {callLog.length === 0 ? (
              <div className="text-gray-500 text-sm">
                No events yet. Run a test above.
              </div>
            ) : (
              <div className="space-y-1 font-mono text-xs text-green-400">
                {callLog.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <h2 className="text-xl font-semibold mb-4">Test Instructions</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold">✅ Expected Behavior:</span>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>
                  Backend errors (401/403, "Token has been revoked", etc.) →
                  Auto-logout
                </li>
                <li>
                  Client-side errors ("Authentication required") → No logout
                </li>
                <li>
                  Tab visibility change after {'>'}4 min → 1 token refresh call,
                  not 8+
                </li>
                <li>
                  Auto-logout shows "Session Expired" toast with redirect to
                  login
                </li>
                <li>Redirect URL preserved: /login?redirect=/current-path</li>
              </ul>
            </div>
            <div className="mt-4">
              <span className="font-semibold">🔍 How to Test:</span>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>
                  Open browser DevTools → Console tab (to see [QueryProvider]
                  logs)
                </li>
                <li>Click test buttons above and observe behavior</li>
                <li>
                  For Test 4: Switch to another tab, wait {'>'}4 minutes, switch
                  back
                </li>
                <li>
                  Check console for: "[QueryProvider] Tab active after idle,
                  refreshing..."
                </li>
                <li>Verify only ONE refresh call happens, not multiple</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
