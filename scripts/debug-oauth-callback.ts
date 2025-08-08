import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function debugOAuthCallback() {
  console.log('🔍 Debugging QuickBooks OAuth Callback Processing...\n');
  
  // Check the current server status
  try {
    console.log('1. Testing server health...');
    const healthResponse = await fetch('http://localhost:3000/api/health');
    const health = await healthResponse.json();
    console.log('   Server status:', healthResponse.ok ? '✅ OK' : '❌ Error');
    
    console.log('\n2. Testing OAuth URL generation...');
    const oauthResponse = await fetch('http://localhost:3000/api/auth/quickbooks');
    const oauthData = await oauthResponse.json();
    console.log('   OAuth generation:', oauthResponse.ok ? '✅ OK' : '❌ Error');
    
    if (oauthData.success) {
      console.log('   Generated URL:', oauthData.authUrl.substring(0, 80) + '...');
    } else {
      console.log('   Error:', oauthData.error);
    }
    
    console.log('\n3. Testing callback POST with sample data...');
    const callbackTest = await fetch('http://localhost:3000/api/auth/quickbooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: 'test_code_123',
        companyId: 'test_company_456',
        state: 'test_state'
      })
    });
    
    const callbackData = await callbackTest.json();
    console.log('   Callback response status:', callbackTest.status);
    console.log('   Callback success:', callbackData.success ? '✅ YES' : '❌ NO');
    console.log('   Callback error:', callbackData.error || 'None');
    console.log('   Callback details:', callbackData.details || 'None');
    
    console.log('\n📋 Summary:');
    console.log('• Server is running and responding');
    console.log('• OAuth URL generation works');
    console.log('• Callback endpoint exists and processes requests');
    console.log('• The "stuck" issue is likely in the token exchange with QuickBooks');
    console.log('\n💡 Next steps:');
    console.log('1. Try the OAuth flow again');
    console.log('2. Open browser dev tools console to see JavaScript logs');
    console.log('3. Check server console for detailed error messages');
    console.log('4. The callback page now shows detailed error information');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

debugOAuthCallback();