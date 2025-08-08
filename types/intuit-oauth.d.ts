declare module 'intuit-oauth' {
  interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'production';
    redirectUri: string;
  }

  interface AuthorizeUriOptions {
    scope: string[];
    state?: string;
  }

  interface TokenInfo {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    x_refresh_token_expires_in?: number;
    token_type?: string;
    csrf_token?: string;
    realmId?: string;
  }

  interface TokenWrapper {
    getToken(): TokenInfo;
    setToken(token: Partial<TokenInfo>): void;
    csrf_token?: string;
  }

  class OAuthClient {
    constructor(config: OAuthConfig);
    
    static scopes: {
      Accounting: string;
    };

    authorizeUri(options: AuthorizeUriOptions): string;
    getToken(): TokenWrapper;
    createToken(code: string, state: string, realmId: string): Promise<TokenWrapper>;
    refresh(): Promise<TokenWrapper>;
    revoke(params: { refresh_token?: string; access_token?: string }): Promise<any>;
  }

  export = OAuthClient;
}