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

// ============================================
// EMAIL CAMPAIGN TYPES
// ============================================

export interface EmailCampaignActivity {
  campaign_activity_id: string;
  role: string; // "primary_email"
  subject?: string;
  preheader?: string;
  from_email?: string;
  from_name?: string;
  reply_to_email?: string;
  html_content?: string;
  physical_address_in_footer?: PhysicalAddress;
}

export interface PhysicalAddress {
  address_line1: string;
  address_line2?: string;
  city: string;
  state_code: string;
  postal_code: string;
  country_code: string;
}

export interface EmailCampaign {
  campaign_id: string;
  name: string;
  type: string;
  type_code: number;
  current_status: string;
  created_at: string;
  updated_at: string;
  campaign_activities: EmailCampaignActivity[];
}

export interface CreateEmailCampaignInput {
  name: string;
  email_campaign_activities: Array<{
    format_type: number; // 5 = custom HTML
    from_email: string;
    from_name: string;
    reply_to_email: string;
    subject: string;
    preheader?: string;
    html_content: string;
    physical_address_in_footer: PhysicalAddress;
  }>;
}

export interface CreateEmailCampaignResponse {
  campaign_id: string;
  campaign_activities: EmailCampaignActivity[];
}

export interface ScheduleEmailInput {
  scheduled_date: string; // ISO 8601 format: "2024-01-15T10:00:00.000Z"
}

export interface SendEmailInput {
  send_to_all_contacts?: boolean;
  contact_lists?: string[]; // List IDs to send to
}

export interface EmailActivitySummary {
  campaign_activity_id: string;
  subject: string;
  sends: number;
  opens: number;
  clicks: number;
  bounces: number;
  unsubscribes: number;
}
