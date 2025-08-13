import { NextRequest, NextResponse } from 'next/server';
import OAuthClient from 'intuit-oauth';

export async function GET(request: NextRequest) {
  try {
    console.log('=== QuickBooks OAuth Debug Info ===');
    console.log('QB_CLIENT_ID:', process.env.QB_CLIENT_ID ? 'SET (length: ' + process.env.QB_CLIENT_ID.length + ')' : 'NOT SET');
    console.log('QB_CLIENT_SECRET:', process.env.QB_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('QB_REDIRECT_URI:', process.env.QB_REDIRECT_URI || 'NOT SET');
    console.log('QB_ENVIRONMENT:', process.env.QB_ENVIRONMENT || 'NOT SET');

    if (!process.env.QB_CLIENT_ID || !process.env.QB_CLIENT_SECRET || !process.env.QB_REDIRECT_URI) {
      const missingVars = [];
      if (!process.env.QB_CLIENT_ID) missingVars.push('QB_CLIENT_ID');
      if (!process.env.QB_CLIENT_SECRET) missingVars.push('QB_CLIENT_SECRET');
      if (!process.env.QB_REDIRECT_URI) missingVars.push('QB_REDIRECT_URI');
      
      console.error('Missing environment variables:', missingVars);
      return NextResponse.json({ 
        error: 'Missing required environment variables', 
        missing: missingVars 
      }, { status: 500 });
    }

    const oauthClient = new OAuthClient({
      clientId: process.env.QB_CLIENT_ID,
      clientSecret: process.env.QB_CLIENT_SECRET,
      environment: (process.env.QB_ENVIRONMENT as 'sandbox' | 'production') || 'production',
      redirectUri: process.env.QB_REDIRECT_URI
    });

    const authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: 'test-state-' + Date.now()
    });

    console.log('Generated auth URI:', authUri);
    console.log('Auth URI length:', authUri.length);
    console.log('===================================');
    
    return NextResponse.redirect(authUri);
  } catch (error) {
    console.error('OAuth error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}