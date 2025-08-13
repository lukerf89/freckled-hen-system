import { NextRequest, NextResponse } from 'next/server';
import OAuthClient from 'intuit-oauth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const realmId = searchParams.get('realmId');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  console.log('=== QuickBooks Callback Debug ===');
  console.log('Full URL:', request.url);
  console.log('Callback received:', { 
    code: code ? code.substring(0, 20) + '...' : null, 
    realmId, 
    state,
    error,
    errorDescription
  });

  // Check for OAuth errors first
  if (error) {
    console.error('OAuth error in callback:', error, errorDescription);
    return NextResponse.redirect(new URL(`/connect-quickbooks?error=oauth_error&message=${encodeURIComponent(errorDescription || error)}`, request.url));
  }

  if (!code || !realmId) {
    return NextResponse.redirect(new URL('/connect-quickbooks?error=missing_params', request.url));
  }

  try {
    console.log('=== Token Exchange Debug ===');
    console.log('Environment variables check:');
    console.log('QB_CLIENT_ID:', process.env.QB_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('QB_CLIENT_SECRET:', process.env.QB_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('QB_REDIRECT_URI:', process.env.QB_REDIRECT_URI);
    console.log('QB_ENVIRONMENT:', process.env.QB_ENVIRONMENT);

    // Try manual token exchange instead of using the library
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
    const authHeader = Buffer.from(`${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`).toString('base64');
    
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.QB_REDIRECT_URI!
    });

    console.log('Making direct token exchange request to:', tokenUrl);
    console.log('With params:', {
      grant_type: 'authorization_code',
      code: code.substring(0, 20) + '...',
      redirect_uri: process.env.QB_REDIRECT_URI
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    });

    console.log('Token response status:', tokenResponse.status);
    console.log('Token response headers:', Object.fromEntries(tokenResponse.headers.entries()));
    
    const tokenResponseText = await tokenResponse.text();
    console.log('Token response body:', tokenResponseText);

    if (!tokenResponse.ok) {
      console.error('Token exchange failed with status:', tokenResponse.status);
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponseText}`);
    }

    const tokens = JSON.parse(tokenResponseText);
    
    console.log('Token exchange successful, Company ID:', realmId);
    
    // Redirect with success and company ID
    return NextResponse.redirect(
      new URL(`/connect-quickbooks?success=true&companyId=${realmId}`, request.url)
    );
  } catch (error: any) {
    console.error('Token exchange error:', error);
    console.error('Error details:', {
      message: error?.message || 'Unknown',
      name: error?.name || 'Unknown',
      status: error?.status || error?.response?.status || 'No status',
      statusText: error?.response?.statusText || 'No status text',
      data: error?.response?.data || 'No response data',
      config: {
        url: error?.config?.url || 'No URL',
        method: error?.config?.method || 'No method',
        data: error?.config?.data ? JSON.parse(error.config.data) : 'No data'
      }
    });
    
    const errorMessage = error?.response?.data?.error_description || 
                        error?.response?.data?.error || 
                        error?.message || 
                        'Token exchange failed';
    
    return NextResponse.redirect(new URL(`/connect-quickbooks?error=token_exchange_failed&message=${encodeURIComponent(errorMessage)}`, request.url));
  }
}