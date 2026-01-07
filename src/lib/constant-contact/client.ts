/**
 * Constant Contact API Client
 * 
 * Handles OAuth 2.0 authentication and API calls
 */

import {
  ConstantContactConfig,
  TokenResponse,
  StoredTokens,
  ContactInput,
  Contact,
  ContactList,
  CreateContactResponse,
} from "./types";

const CC_AUTH_BASE = "https://authz.constantcontact.com/oauth2/default/v1";
const CC_API_BASE = "https://api.cc.email/v3";

// In-memory token storage (replace with database in production)
let storedTokens: StoredTokens | null = null;

export class ConstantContactClient {
  private config: ConstantContactConfig;

  constructor(config: ConstantContactConfig) {
    this.config = config;
  }

  /**
   * Generate the OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: "contact_data offline_access",
      state: state || crypto.randomUUID(),
    });

    return `${CC_AUTH_BASE}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<StoredTokens> {
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString("base64");

    const response = await fetch(`${CC_AUTH_BASE}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data: TokenResponse = await response.json();

    const tokens: StoredTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    // Store tokens
    storedTokens = tokens;
    
    return tokens;
  }

  /**
   * Refresh the access token
   */
  async refreshAccessToken(): Promise<StoredTokens> {
    if (!storedTokens?.refreshToken) {
      throw new Error("No refresh token available");
    }

    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString("base64");

    const response = await fetch(`${CC_AUTH_BASE}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: storedTokens.refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const data: TokenResponse = await response.json();

    const tokens: StoredTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    storedTokens = tokens;
    
    return tokens;
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidToken(): Promise<string> {
    if (!storedTokens) {
      throw new Error("Not authenticated. Please complete OAuth flow first.");
    }

    // Refresh if token expires in less than 5 minutes
    if (storedTokens.expiresAt < Date.now() + 5 * 60 * 1000) {
      await this.refreshAccessToken();
    }

    return storedTokens.accessToken;
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return storedTokens !== null;
  }

  /**
   * Set tokens directly (for restoring from database)
   */
  setTokens(tokens: StoredTokens): void {
    storedTokens = tokens;
  }

  /**
   * Get current tokens (for saving to database)
   */
  getTokens(): StoredTokens | null {
    return storedTokens;
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getValidToken();

    const response = await fetch(`${CC_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} - ${error}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {} as T;
    
    return JSON.parse(text);
  }

  /**
   * Get all contact lists
   */
  async getLists(): Promise<ContactList[]> {
    const response = await this.apiRequest<{ lists: ContactList[] }>("/contact_lists");
    return response.lists || [];
  }

  /**
   * Create a new contact list
   */
  async createList(name: string, description?: string): Promise<ContactList> {
    return this.apiRequest<ContactList>("/contact_lists", {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        favorite: false,
      }),
    });
  }

  /**
   * Add or update a contact
   */
  async upsertContact(input: ContactInput): Promise<CreateContactResponse> {
    const body = {
      email_address: {
        address: input.email,
        permission_to_send: "implicit",
      },
      first_name: input.firstName,
      last_name: input.lastName,
      phone_numbers: input.phone
        ? [{ phone_number: input.phone, kind: "mobile" }]
        : undefined,
      list_memberships: input.listIds,
      create_source: "Account",
    };

    return this.apiRequest<CreateContactResponse>("/contacts/sign_up_form", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Get a contact by email
   */
  async getContactByEmail(email: string): Promise<Contact | null> {
    try {
      const response = await this.apiRequest<{ contacts: Contact[] }>(
        `/contacts?email=${encodeURIComponent(email)}`
      );
      return response.contacts?.[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Add contact to a list
   */
  async addContactToList(contactId: string, listId: string): Promise<void> {
    await this.apiRequest(`/contacts/${contactId}`, {
      method: "PUT",
      body: JSON.stringify({
        list_memberships: [listId],
      }),
    });
  }
}

// Singleton instance
let clientInstance: ConstantContactClient | null = null;

export function getConstantContactClient(): ConstantContactClient {
  if (!clientInstance) {
    const clientId = process.env.CONSTANT_CONTACT_CLIENT_ID;
    const clientSecret = process.env.CONSTANT_CONTACT_CLIENT_SECRET;
    const redirectUri = process.env.CONSTANT_CONTACT_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Constant Contact credentials not configured");
    }

    clientInstance = new ConstantContactClient({
      clientId,
      clientSecret,
      redirectUri,
    });
  }

  return clientInstance;
}

export { storedTokens };
