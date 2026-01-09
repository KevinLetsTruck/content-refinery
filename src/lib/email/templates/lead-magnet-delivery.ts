/**
 * Lead Magnet Email Templates
 * Branded dark theme templates for lead magnet delivery
 */

interface LeadMagnetDeliveryData {
  firstName?: string;
  email: string;
  leadMagnetTitle: string;
  downloadUrl: string;
  previewPoints?: string[];
  landingPageSlug?: string;
}

interface EmailOutput {
  subject: string;
  preheader: string;
  html: string;
  text: string;
}

const BRAND_COLORS = {
  background: "#0d0d0d",
  cardBackground: "#1f1f1f",
  accent: "#ff4500",
  accentHover: "#e63e00",
  text: "#ffffff",
  textMuted: "#a0a0a0",
  border: "#2a2a2a",
};

const EMAIL_STYLES = `
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: ${BRAND_COLORS.background};
    color: ${BRAND_COLORS.text};
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 20px;
  }
  .header {
    text-align: center;
    padding-bottom: 30px;
    border-bottom: 1px solid ${BRAND_COLORS.border};
    margin-bottom: 30px;
  }
  .logo {
    font-size: 24px;
    font-weight: bold;
    color: ${BRAND_COLORS.accent};
    text-decoration: none;
  }
  .card {
    background-color: ${BRAND_COLORS.cardBackground};
    border-radius: 12px;
    padding: 30px;
    margin-bottom: 20px;
  }
  h1 {
    font-size: 28px;
    margin: 0 0 10px 0;
    color: ${BRAND_COLORS.text};
  }
  h2 {
    font-size: 20px;
    margin: 0 0 15px 0;
    color: ${BRAND_COLORS.text};
  }
  p {
    font-size: 16px;
    line-height: 1.6;
    margin: 0 0 15px 0;
    color: ${BRAND_COLORS.textMuted};
  }
  .greeting {
    color: ${BRAND_COLORS.text};
    font-size: 18px;
  }
  .download-button {
    display: inline-block;
    background-color: ${BRAND_COLORS.accent};
    color: ${BRAND_COLORS.text} !important;
    text-decoration: none;
    padding: 16px 32px;
    border-radius: 8px;
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    margin: 20px 0;
  }
  .download-button:hover {
    background-color: ${BRAND_COLORS.accentHover};
  }
  .preview-list {
    margin: 20px 0;
    padding: 0;
    list-style: none;
  }
  .preview-list li {
    padding: 10px 0 10px 25px;
    position: relative;
    color: ${BRAND_COLORS.textMuted};
    border-bottom: 1px solid ${BRAND_COLORS.border};
  }
  .preview-list li:last-child {
    border-bottom: none;
  }
  .preview-list li::before {
    content: "\\2713";
    position: absolute;
    left: 0;
    color: ${BRAND_COLORS.accent};
    font-weight: bold;
  }
  .signature {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid ${BRAND_COLORS.border};
  }
  .signature-name {
    font-weight: bold;
    color: ${BRAND_COLORS.text};
    margin: 0;
  }
  .signature-title {
    color: ${BRAND_COLORS.textMuted};
    font-size: 14px;
    margin: 5px 0 0 0;
  }
  .footer {
    text-align: center;
    padding-top: 30px;
    margin-top: 30px;
    border-top: 1px solid ${BRAND_COLORS.border};
    font-size: 12px;
    color: ${BRAND_COLORS.textMuted};
  }
  .footer a {
    color: ${BRAND_COLORS.textMuted};
    text-decoration: underline;
  }
`;

/**
 * Generate welcome email with download button for lead magnet delivery
 */
export function generateLeadMagnetDeliveryEmail(data: LeadMagnetDeliveryData): EmailOutput {
  const greeting = data.firstName ? `Hey ${data.firstName}` : "Hey";

  const previewPointsHtml = data.previewPoints?.length
    ? `
      <div style="margin-top: 25px;">
        <h2 style="font-size: 18px; margin: 0 0 15px 0; color: ${BRAND_COLORS.text};">What's inside:</h2>
        <ul class="preview-list">
          ${data.previewPoints.map((point) => `<li>${point}</li>`).join("")}
        </ul>
      </div>
    `
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Guide is Ready - ${data.leadMagnetTitle}</title>
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="https://letstruck.com" class="logo">LET'S TRUCK</a>
    </div>

    <div class="card">
      <p class="greeting">${greeting},</p>

      <h1 style="margin-top: 15px;">Your guide is ready!</h1>

      <p>
        You requested <strong style="color: ${BRAND_COLORS.text};">${data.leadMagnetTitle}</strong>
        and it's ready for you to download right now.
      </p>

      <div style="text-align: center;">
        <a href="${data.downloadUrl}" class="download-button">
          Download Your Guide
        </a>
      </div>

      ${previewPointsHtml}

      <p style="margin-top: 25px;">
        This guide contains strategies that have helped thousands of professional drivers
        take control of their health while living life on the road.
      </p>

      <p>
        Don't just read it - <strong style="color: ${BRAND_COLORS.text};">implement it</strong>.
        Pick one thing and start today.
      </p>

      <div class="signature">
        <p class="signature-name">Kevin Rutherford, FNTP</p>
        <p class="signature-title">Let's Truck Health Coaching</p>
      </div>
    </div>

    <div class="footer">
      <p>
        You're receiving this because you signed up at letstruck.com.<br>
        <a href="{{unsubscribe_url}}">Unsubscribe</a> |
        <a href="https://letstruck.com/privacy">Privacy Policy</a>
      </p>
      <p style="margin-top: 10px;">
        Let's Truck Health Coaching<br>
        &copy; ${new Date().getFullYear()} Let's Truck. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const previewPointsText = data.previewPoints?.length
    ? `\nWhat's inside:\n${data.previewPoints.map((p) => `- ${p}`).join("\n")}\n`
    : "";

  const text = `
${greeting},

Your guide is ready!

You requested "${data.leadMagnetTitle}" and it's ready for you to download right now.

DOWNLOAD YOUR GUIDE: ${data.downloadUrl}

${previewPointsText}
This guide contains strategies that have helped thousands of professional drivers take control of their health while living life on the road.

Don't just read it - implement it. Pick one thing and start today.

Kevin Rutherford, FNTP
Let's Truck Health Coaching

---
You're receiving this because you signed up at letstruck.com.
To unsubscribe, visit: {{unsubscribe_url}}
  `.trim();

  return {
    subject: `Your guide is ready: ${data.leadMagnetTitle}`,
    preheader: `Download ${data.leadMagnetTitle} - strategies that are changing driver health`,
    html,
    text,
  };
}

/**
 * Generate 24-hour reminder email if lead hasn't downloaded yet
 */
export function generateDownloadReminderEmail(data: LeadMagnetDeliveryData): EmailOutput {
  const greeting = data.firstName ? `Hey ${data.firstName}` : "Hey";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Did you grab your guide?</title>
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="https://letstruck.com" class="logo">LET'S TRUCK</a>
    </div>

    <div class="card">
      <p class="greeting">${greeting},</p>

      <h1 style="margin-top: 15px;">Did you grab your guide?</h1>

      <p>
        I noticed you haven't downloaded <strong style="color: ${BRAND_COLORS.text};">${data.leadMagnetTitle}</strong> yet.
      </p>

      <p>
        Life on the road is busy - I get it. But this guide has helped thousands of drivers
        make real changes to their health.
      </p>

      <p>
        Don't let it sit in your inbox. Grab it now:
      </p>

      <div style="text-align: center;">
        <a href="${data.downloadUrl}" class="download-button">
          Download Now
        </a>
      </div>

      <p style="margin-top: 25px; font-size: 14px; color: ${BRAND_COLORS.textMuted};">
        Your download link expires in 7 days, so don't wait too long.
      </p>

      <div class="signature">
        <p class="signature-name">Kevin Rutherford, FNTP</p>
        <p class="signature-title">Let's Truck Health Coaching</p>
      </div>
    </div>

    <div class="footer">
      <p>
        You're receiving this because you signed up at letstruck.com.<br>
        <a href="{{unsubscribe_url}}">Unsubscribe</a> |
        <a href="https://letstruck.com/privacy">Privacy Policy</a>
      </p>
      <p style="margin-top: 10px;">
        Let's Truck Health Coaching<br>
        &copy; ${new Date().getFullYear()} Let's Truck. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
${greeting},

Did you grab your guide?

I noticed you haven't downloaded "${data.leadMagnetTitle}" yet.

Life on the road is busy - I get it. But this guide has helped thousands of drivers make real changes to their health.

Don't let it sit in your inbox. Grab it now:

DOWNLOAD NOW: ${data.downloadUrl}

Your download link expires in 7 days, so don't wait too long.

Kevin Rutherford, FNTP
Let's Truck Health Coaching

---
You're receiving this because you signed up at letstruck.com.
To unsubscribe, visit: {{unsubscribe_url}}
  `.trim();

  return {
    subject: `Did you grab your guide? - ${data.leadMagnetTitle}`,
    preheader: "Your download is waiting - don't miss out",
    html,
    text,
  };
}

export type { LeadMagnetDeliveryData, EmailOutput };
