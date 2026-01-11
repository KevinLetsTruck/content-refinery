/**
 * Resend Email Service
 * Handles transactional email sending for lead magnet delivery
 */

import { Resend } from "resend";
import { generateLeadMagnetDeliveryEmail, LeadMagnetDeliveryData } from "./templates/lead-magnet-delivery";

// Use Resend's free testing domain by default (no domain verification needed)
// Once letstruck.com is verified in Resend, update RESEND_FROM_EMAIL
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const FROM_NAME = process.env.RESEND_FROM_NAME || "Let's Truck";

let resendClient: Resend | null = null;

/**
 * Check if Resend is configured
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Get or create Resend client
 */
function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Send lead magnet delivery email with download link
 */
export async function sendLeadMagnetEmail(data: LeadMagnetDeliveryData): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!isResendConfigured()) {
    console.log("[Email] Resend not configured, skipping email send");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const client = getResendClient();
    const emailContent = generateLeadMagnetDeliveryEmail(data);

    // Replace unsubscribe placeholder with actual URL (or remove for now)
    const html = emailContent.html.replace(
      "{{unsubscribe_url}}",
      `https://content-refinery-07dc.onrender.com/unsubscribe?email=${encodeURIComponent(data.email)}`
    );
    const text = emailContent.text.replace(
      "{{unsubscribe_url}}",
      `https://content-refinery-07dc.onrender.com/unsubscribe?email=${encodeURIComponent(data.email)}`
    );

    const result = await client.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: data.email,
      subject: emailContent.subject,
      html,
      text,
      tags: [
        { name: "type", value: "lead-magnet-delivery" },
        { name: "lead-magnet", value: data.landingPageSlug || "unknown" },
      ],
    });

    if (result.error) {
      console.error("[Email] Failed to send:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[Email] Lead magnet delivery email sent to ${data.email}, ID: ${result.data?.id}`);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Email] Error sending email:", message);
    return { success: false, error: message };
  }
}
