// QuickBooks OAuth2 Implementation
// Based on: https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0

import crypto from 'crypto';

export class QuickBooksOAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private environment: 'sandbox' | 'production';
  
  // OAuth2 URLs
  private readonly DISCOVERY_URL = 'https://developer.api.intuit.com/.well-known/openid_configuration';
  private readonly AUTHORIZATION_URL = 'https://appcenter.intuit.com/connect/oauth2';
  private readonly TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
  private readonly REVOKE_URL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';
  
  // API Base URLs
  private readonly SANDBOX_BASE_URL = 'https://sandbox-quickbooks.api.intuit.com';
  private readonly PRODUCTION_BASE_URL = 'https://quickbooks.api.intuit.com';
  
  constructor(config: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    environment: 'sandbox' | 'production';
  }) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    this.environment = config.environment;
  }
  
  /**
   * Generate OAuth2 authorization URL
   */
  getAuthorizationUrl(scopes: string = 'com.intuit.quickbooks.accounting'): { url: string; state: string } {
    // Generate CSRF state token
    const state = crypto.randomBytes(16).toString('hex');
    
    // Build authorization URL
    const params = new URLSearchParams({
      'client_id': this.clientId,
      'scope': scopes,
      'redirect_uri': this.redirectUri,
      'response_type': 'code',
      'state': state,
      'access_type': 'offline' // Request refresh token
    });
    
    const url = `${this.AUTHORIZATION_URL}?${params.toString()}`;
    
    console.log('🔐 QuickBooks OAuth URL generated:');
    console.log('   Environment:', this.environment);
    console.log('   Client ID:', this.clientId.substring(0, 15) + '...');
    console.log('   Redirect URI:', this.redirectUri);
    console.log('   Scopes:', scopes);
    console.log('   State:', state);
    
    return { url, state };
  }
  
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, realmId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
    token_type: string;
    id_token?: string;
  }> {
    console.log('🔄 Exchanging authorization code for tokens...');
    console.log('   Code:', code.substring(0, 20) + '...');
    console.log('   Realm ID (Company ID):', realmId);
    
    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const params = new URLSearchParams({
      'grant_type': 'authorization_code',
      'code': code,
      'redirect_uri': this.redirectUri
    });
    
    try {
      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      
      const responseText = await response.text();
      console.log('📡 Token exchange response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ Token exchange failed:', responseText);
        throw new Error(`Token exchange failed: ${response.status} ${responseText}`);
      }
      
      const tokens = JSON.parse(responseText);
      console.log('✅ Tokens obtained successfully');
      console.log('   Access token expires in:', tokens.expires_in, 'seconds');
      console.log('   Refresh token expires in:', tokens.x_refresh_token_expires_in, 'seconds');
      
      return tokens;
    } catch (error) {
      console.error('❌ Token exchange error:', error);
      throw error;
    }
  }
  
  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
    token_type: string;
  }> {
    console.log('🔄 Refreshing access token...');
    
    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const params = new URLSearchParams({
      'grant_type': 'refresh_token',
      'refresh_token': refreshToken
    });
    
    try {
      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token refresh failed:', errorText);
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
      }
      
      const tokens = await response.json();
      console.log('✅ Token refreshed successfully');
      
      return tokens;
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      throw error;
    }
  }
  
  /**
   * Revoke tokens
   */
  async revokeTokens(token: string, tokenType: 'access_token' | 'refresh_token' = 'refresh_token'): Promise<boolean> {
    console.log('🔄 Revoking tokens...');
    
    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const params = new URLSearchParams({
      'token': token,
      'token_type_hint': tokenType
    });
    
    try {
      const response = await fetch(this.REVOKE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      
      if (response.ok) {
        console.log('✅ Tokens revoked successfully');
        return true;
      } else {
        console.error('❌ Token revocation failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Token revocation error:', error);
      return false;
    }
  }
  
  /**
   * Get API base URL based on environment
   */
  getApiBaseUrl(): string {
    return this.environment === 'sandbox' ? this.SANDBOX_BASE_URL : this.PRODUCTION_BASE_URL;
  }
  
  /**
   * Make authenticated API request
   */
  async makeApiRequest(
    accessToken: string,
    companyId: string,
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<any> {
    const url = `${this.getApiBaseUrl()}/v3/company/${companyId}/${endpoint}`;
    
    console.log(`📡 Making QuickBooks API request: ${method} ${url}`);
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    };
    
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API request failed:', errorText);
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ API request successful');
      
      return data;
    } catch (error) {
      console.error('❌ API request error:', error);
      throw error;
    }
  }
}