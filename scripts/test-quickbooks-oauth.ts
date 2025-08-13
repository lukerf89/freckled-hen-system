import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testQuickBooksOAuth() {
  console.log('🧪 Testing QuickBooks OAuth Setup...\n');
  
  try {
    // Test 1: Check environment variables
    console.log('1. Testing Environment Variables...');
    const clientId = process.env.QB_CLIENT_ID;
    const clientSecret = process.env.QB_CLIENT_SECRET;
    const redirectUri = process.env.QB_REDIRECT_URI;
    const environment = process.env.QB_ENVIRONMENT;
    
    console.log('   Client ID:', clientId ? `${clientId.substring(0, 15)}...` : '❌ MISSING');
    console.log('   Client Secret:', clientSecret ? '✅ SET' : '❌ MISSING');
    console.log('   Redirect URI:', redirectUri || '❌ MISSING');
    console.log('   Environment:', environment || '❌ MISSING');
    
    if (!clientId || !clientSecret || !redirectUri) {
      console.error('\n❌ Missing required environment variables');
      return;
    }
    
    // Test 2: OAuth URL Generation
    console.log('\n2. Testing OAuth URL Generation...');
    const response = await fetch('http://localhost:3000/api/auth/quickbooks', {
      method: 'GET'
    });
    
    if (!response.ok) {
      console.error(`❌ OAuth API failed: ${response.status}`);
      const errorText = await response.text();
      console.error('   Error:', errorText);
      return;
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ OAuth URL generated successfully');
      console.log('   URL:', result.authUrl);
      console.log('   State:', result.state);
      console.log('   Environment:', result.debug.environment);
      
      // Test 3: Validate OAuth URL structure
      console.log('\n3. Validating OAuth URL Structure...');
      const url = new URL(result.authUrl);
      const params = url.searchParams;
      
      console.log('   Base URL:', url.origin + url.pathname);
      console.log('   Client ID:', params.get('client_id') ? '✅ Present' : '❌ Missing');
      console.log('   Scope:', params.get('scope') || '❌ Missing');
      console.log('   Redirect URI:', params.get('redirect_uri') ? '✅ Present' : '❌ Missing');
      console.log('   Response Type:', params.get('response_type') || '❌ Missing');
      console.log('   State:', params.get('state') ? '✅ Present' : '❌ Missing');
      
      const requiredParams = ['client_id', 'scope', 'redirect_uri', 'response_type', 'state'];
      const missingParams = requiredParams.filter(param => !params.get(param));
      
      if (missingParams.length === 0) {
        console.log('✅ All required OAuth parameters present');
      } else {
        console.error('❌ Missing parameters:', missingParams.join(', '));
      }
      
      console.log('\n🎉 QuickBooks OAuth setup is ready!');
      console.log('\n📋 Next Steps:');
      console.log('1. Visit: http://localhost:3000/connect-quickbooks');
      console.log('2. Click "Connect to QuickBooks" button');
      console.log('3. Complete OAuth flow in QuickBooks');
      console.log('4. Copy the Company ID from the callback page');
      console.log('5. Update QB_COMPANY_ID in .env.local');
      
    } else {
      console.error('❌ OAuth URL generation failed:', result.error);
      if (result.debug) {
        console.error('   Debug info:', result.debug);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('   Error details:', error.message);
    }
  }
}

testQuickBooksOAuth();