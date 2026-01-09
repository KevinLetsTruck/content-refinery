// Constant Contact API v3 Service
// Handles contact management, list operations, and email sending

interface Contact {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  listIds: string[];
  tags?: string[];
}

interface EmailSend {
  to: string;
  subject: string;
  preheader?: string;
  htmlContent: string;
  textContent?: string;
}

interface CCList {
  id: string;
  name: string;
  contactCount: number;
}

interface CCTag {
  tag_id: string;
  name: string;
}

interface CCContactSearchResponse {
  contacts?: Array<{
    contact_id: string;
    email_address?: { address: string };
  }>;
}

interface CCListsResponse {
  lists: Array<{
    list_id: string;
    name: string;
    membership_count?: number;
  }>;
}

interface CCTagsResponse {
  tags?: CCTag[];
}

interface CCCampaignResponse {
  campaign_id: string;
  campaign_activities?: Array<{
    campaign_activity_id: string;
  }>;
}

class ConstantContactService {
  private baseUrl = "https://api.cc.email/v3";

  private get headers() {
    return {
      Authorization: `Bearer ${process.env.CONSTANT_CONTACT_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...this.headers, ...options.headers },
    });
    if (!res.ok) {
      const error = await res.text();
      console.error(`CC API Error ${res.status}:`, error);
      throw new Error(`Constant Contact API error: ${res.status}`);
    }
    return res.json();
  }

  async upsertContact(contact: Contact): Promise<{ contactId: string; created: boolean }> {
    // Search for existing contact
    const search = await this.request<CCContactSearchResponse>(
      `/contacts?email=${encodeURIComponent(contact.email)}`
    );

    if (search.contacts && search.contacts.length > 0) {
      const existing = search.contacts[0];
      await this.request(`/contacts/${existing.contact_id}`, {
        method: "PUT",
        body: JSON.stringify({
          email_address: { address: contact.email },
          first_name: contact.firstName,
          last_name: contact.lastName,
          list_memberships: contact.listIds,
        }),
      });
      return { contactId: existing.contact_id, created: false };
    }

    const created = await this.request<{ contact_id: string }>("/contacts", {
      method: "POST",
      body: JSON.stringify({
        email_address: { address: contact.email, permission_to_send: "implicit" },
        first_name: contact.firstName,
        last_name: contact.lastName,
        list_memberships: contact.listIds,
        create_source: "Contact",
      }),
    });
    return { contactId: created.contact_id, created: true };
  }

  async getLists(): Promise<CCList[]> {
    const res = await this.request<CCListsResponse>("/contact_lists?include_count=true");
    return res.lists.map((l) => ({
      id: l.list_id,
      name: l.name,
      contactCount: l.membership_count || 0,
    }));
  }

  async tagContact(contactId: string, tagName: string): Promise<void> {
    const tagsRes = await this.request<CCTagsResponse>("/contact_tags");
    let tag = tagsRes.tags?.find((t) => t.name === tagName);

    if (!tag) {
      tag = await this.request<CCTag>("/contact_tags", {
        method: "POST",
        body: JSON.stringify({ name: tagName }),
      });
    }

    await this.request(`/contacts/${contactId}/taggings`, {
      method: "POST",
      body: JSON.stringify({ tag_id: tag.tag_id }),
    }).catch(() => {}); // Ignore if already tagged
  }

  async createEmailCampaign(params: {
    name: string;
    subject: string;
    preheader?: string;
    htmlContent: string;
    textContent?: string;
    listIds: string[];
    scheduledDate?: Date;
  }) {
    const campaign = await this.request<CCCampaignResponse>("/emails", {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        email_campaign_activities: [
          {
            format_type: 5,
            from_email: process.env.DEFAULT_FROM_EMAIL || "kevin@letstruck.com",
            from_name: process.env.DEFAULT_FROM_NAME || "Kevin Castagna",
            reply_to_email: process.env.DEFAULT_REPLY_EMAIL || "kevin@letstruck.com",
            subject: params.subject,
            preheader: params.preheader,
            html_content: params.htmlContent,
            text_content: params.textContent,
          },
        ],
      }),
    });
    return {
      campaignId: campaign.campaign_id,
      activityId: campaign.campaign_activities?.[0]?.campaign_activity_id,
    };
  }
}

export const constantContactService = new ConstantContactService();
export type { Contact, EmailSend, CCList };
