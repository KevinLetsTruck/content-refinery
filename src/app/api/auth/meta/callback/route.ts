import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/config";

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
}

interface InstagramAccount {
  id: string;
  username: string;
  name?: string;
}

/**
 * GET /api/auth/meta/callback
 * Handles OAuth callback from Facebook, exchanges code for tokens
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return renderError("Authorization Failed", errorDescription || error);
  }

  if (!code) {
    return renderError("Missing Authorization Code", "No authorization code received from Facebook.");
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const baseUrl = getBaseUrl();
  const redirectUri = `${baseUrl}/api/auth/meta/callback`;

  if (!appId || !appSecret) {
    return renderError("Configuration Error", "META_APP_ID or META_APP_SECRET not configured in environment.");
  }

  try {
    // Step 1: Exchange code for short-lived user access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        }),
      { method: "GET" }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      return renderError(
        "Token Exchange Failed",
        tokenData.error?.message || JSON.stringify(tokenData)
      );
    }

    const shortLivedToken = tokenData.access_token;

    // Step 2: Exchange for long-lived user token (60-day expiry)
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLivedToken,
        }),
      { method: "GET" }
    );

    const longLivedData = await longLivedResponse.json();
    const longLivedToken = longLivedData.access_token || shortLivedToken;
    const expiresIn = longLivedData.expires_in; // seconds (usually 5184000 = 60 days)

    // Step 3: Get user info
    const userResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${longLivedToken}`
    );
    const userData = await userResponse.json();

    // Step 4: Get Facebook Pages the user manages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,category&access_token=${longLivedToken}`
    );
    const pagesData = await pagesResponse.json();
    const pages: FacebookPage[] = pagesData.data || [];

    // Step 5: For each page, try to get the connected Instagram Business Account
    const pagesWithInstagram: Array<FacebookPage & { instagram?: InstagramAccount }> = [];

    for (const page of pages) {
      const igResponse = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account{id,username,name}&access_token=${page.access_token}`
      );
      const igData = await igResponse.json();

      pagesWithInstagram.push({
        ...page,
        instagram: igData.instagram_business_account,
      });
    }

    // Render success page with all tokens and page info
    return renderSuccess({
      user: userData,
      userToken: longLivedToken,
      expiresIn,
      pages: pagesWithInstagram,
      appId,
    });
  } catch (err) {
    console.error("Meta OAuth error:", err);
    return renderError("Error", err instanceof Error ? err.message : "Unknown error occurred");
  }
}

function renderError(title: string, message: string): NextResponse {
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Meta Auth Error</title>
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; background: #0D0D0D; color: white; }
          .error { background: #FF4500; padding: 20px; border-radius: 8px; }
          h1 { color: #FF4500; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="error">${message}</div>
        <p style="margin-top: 20px;"><a href="/settings" style="color: #FF4500;">Back to Settings</a></p>
      </body>
    </html>
    `,
    { headers: { "Content-Type": "text/html" } }
  );
}

function renderSuccess(data: {
  user: { id: string; name: string };
  userToken: string;
  expiresIn?: number;
  pages: Array<FacebookPage & { instagram?: InstagramAccount }>;
  appId: string;
}): NextResponse {
  const { user, userToken, expiresIn, pages, appId } = data;

  const pagesHtml = pages.length > 0
    ? pages.map((page, index) => `
        <div class="page-card" style="background: #1A1A1A; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${index === 0 ? '#10B981' : '#FF4500'};">
          <h3 style="margin-top: 0; color: #F4A300;">${page.name}</h3>
          <p style="color: #888; margin: 5px 0;">Category: ${page.category}</p>
          <p style="color: #888; margin: 5px 0;">Page ID: <code style="background: #0D0D0D; padding: 2px 6px; border-radius: 3px;">${page.id}</code></p>
          ${page.instagram
            ? `<p style="color: #10B981; margin: 5px 0;">Instagram: @${page.instagram.username} (ID: <code style="background: #0D0D0D; padding: 2px 6px; border-radius: 3px;">${page.instagram.id}</code>)</p>`
            : `<p style="color: #888; margin: 5px 0;">No Instagram connected</p>`
          }
          <div style="margin-top: 15px;">
            <label style="color: #888; font-size: 12px;">Page Access Token (never expires):</label>
            <div class="token" style="font-family: monospace; word-break: break-all; background: #0D0D0D; padding: 10px; border-radius: 4px; font-size: 11px; margin-top: 5px;" id="token-${index}">${page.access_token}</div>
            <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('token-${index}').textContent); this.textContent='Copied!';" style="background: #FF4500; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 8px; font-size: 12px;">
              Copy Token
            </button>
          </div>
        </div>
      `).join("")
    : `<p style="color: #F4A300;">No Facebook Pages found. Make sure you have admin access to at least one Facebook Page.</p>`;

  // Get the recommended page (first one)
  const recommendedPage = pages[0];
  const envExample = recommendedPage
    ? `META_ACCESS_TOKEN=${recommendedPage.access_token}
FACEBOOK_PAGE_ID=${recommendedPage.id}${recommendedPage.instagram ? `
INSTAGRAM_BUSINESS_ACCOUNT_ID=${recommendedPage.instagram.id}` : ""}`
    : "# No pages found - connect a Facebook Page first";

  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Meta Connected!</title>
        <style>
          body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; background: #0D0D0D; color: white; }
          .success { background: #10B981; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          h2 { color: #F4A300; margin-top: 30px; border-bottom: 1px solid #333; padding-bottom: 10px; }
          .env-example { background: #1A1A1A; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 13px; white-space: pre-wrap; border: 1px solid #333; }
          .copy-btn:hover { background: #FF5722; }
          .info { color: #10B981; font-size: 14px; }
          .warning { color: #F4A300; font-size: 14px; }
          code { background: #1A1A1A; padding: 2px 6px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1 style="margin: 0;">Meta Connected!</h1>
        </div>

        <p>Logged in as: <strong>${user.name}</strong> (ID: ${user.id})</p>

        <h2>Your Facebook Pages</h2>
        <p class="info">Select a page to use for publishing. Page Access Tokens never expire (as long as the page exists and you have admin access).</p>
        ${pagesHtml}

        <h2>Environment Variables</h2>
        <p>Add these to your <code>.env.local</code> file and Render dashboard:</p>
        <div class="env-example">${envExample}</div>
        <button class="copy-btn" onclick="navigator.clipboard.writeText(\`${envExample.replace(/`/g, '\\`')}\`); this.textContent='Copied!';" style="background: #FF4500; border: none; color: white; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 10px;">
          Copy Environment Variables
        </button>

        ${expiresIn ? `
        <h2>User Token Info</h2>
        <p class="warning">Your user token expires in ${Math.round(expiresIn / 86400)} days. However, the Page Access Tokens above never expire.</p>
        ` : ""}

        <h2>Next Steps</h2>
        <ol style="color: #ccc; line-height: 1.8;">
          <li>Copy the environment variables above</li>
          <li>Add them to your <code>.env.local</code> file</li>
          <li>Add them to your Render dashboard (Environment section)</li>
          <li>Restart your app (or wait for Render to redeploy)</li>
          <li>Test publishing from the Dashboard or Queue</li>
        </ol>

        <p style="margin-top: 30px;"><a href="/settings" style="color: #FF4500;">Go to Settings</a> | <a href="/dashboard" style="color: #FF4500;">Go to Dashboard</a></p>
      </body>
    </html>
    `,
    { headers: { "Content-Type": "text/html" } }
  );
}
