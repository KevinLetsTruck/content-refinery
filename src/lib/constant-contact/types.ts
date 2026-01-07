/**
 * Constant Contact API Types
 */

export interface ConstantContactConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

export interface ContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  customFields?: Record<string, string>;
  listIds: string[];
}

export interface Contact {
  contact_id: string;
  email_address: {
    address: string;
    permission_to_send: string;
  };
  first_name?: string;
  last_name?: string;
  create_source: string;
  list_memberships: string[];
}

export interface ContactList {
  list_id: string;
  name: string;
  description?: string;
  favorite: boolean;
  created_at: string;
  updated_at: string;
  membership_count: number;
}

export interface CreateContactResponse {
  contact_id: string;
  action: "created" | "updated";
}

export interface ApiError {
  error_key: string;
  error_message: string;
}
