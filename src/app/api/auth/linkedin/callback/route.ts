import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/config";

/**
 * GET /api/auth/linkedin/callback
 * Handles OAuth callback from LinkedIn, exchanges code for access token
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>LinkedIn Auth Error</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; background: #0D0D0D; color: white; }
            .error { background: #FF4500; padding: 20px; border-radius: 8px; }
            h1 { color: #FF4500; }
          </style>
        </head>
        <body>
          <h1>LinkedIn Authorization Failed</h1>
          <div class="error">
            <strong>Error:</strong> ${error}<br>
            <strong>Description:</strong> ${errorDescription || "No description provided"}
          </div>
          <p>Please try again or check your LinkedIn app settings.</p>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>LinkedIn Auth Error</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; background: #0D0D0D; color: white; }
            .error { background: #FF4500; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Missing Authorization Code</h1>
          <div class="error">No authorization code received from LinkedIn.</div>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const baseUrl = getBaseUrl();
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${baseUrl}/api/auth/linkedin/callback`;

  if (!clientId || !clientSecret) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Configuration Error</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; background: #0D0D0D; color: white; }
            .error { background: #FF4500; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Configuration Error</h1>
          <div class="error">LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET not configured in environment.</div>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Exchange code for access token
  try {
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Token Exchange Failed</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; background: #0D0D0D; color: white; }
              .error { background: #FF4500; padding: 20px; border-radius: 8px; }
              pre { background: #1A1A1A; padding: 15px; border-radius: 4px; overflow-x: auto; }
            </style>
          </head>
          <body>
            <h1>Token Exchange Failed</h1>
            <div class="error">
              <pre>${JSON.stringify(tokenData, null, 2)}</pre>
            </div>
          </body>
        </html>
        `,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in; // seconds

    // Get user profile to find their URN (needed for posting)
    const profileResponse = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profileData = await profileResponse.json();
    const userUrn = profileData.id; // This is the person ID
    const userName = profileData.localizedFirstName ? `${profileData.localizedFirstName} ${profileData.localizedLastName || ''}`.trim() : null;

    // Calculate expiration date
    const expirationDate = new Date(Date.now() + expiresIn * 1000);

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>LinkedIn Connected!</title>
          <style>
            body { font-family: system-ui; max-width: 700px; margin: 50px auto; padding: 20px; background: #0D0D0D; color: white; }
            .success { background: #10B981; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .token-box { background: #1A1A1A; padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid #2A2A2A; }
            .token { font-family: monospace; word-break: break-all; background: #0D0D0D; padding: 15px; border-radius: 4px; font-size: 12px; }
            .copy-btn { background: #FF4500; border: none; color: white; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 10px; }
            .copy-btn:hover { background: #FF5722; }
            h2 { color: #F4A300; margin-top: 30px; }
            .warning { color: #F4A300; font-size: 14px; }
            .env-example { background: #1A1A1A; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 13px; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1 style="margin: 0;">✅ LinkedIn Connected!</h1>
          </div>
          
          <p>Successfully authorized <strong>${userName || 'your account'}</strong>.</p>
          
          <h2>Your Access Token</h2>
          <div class="token-box">
            <div class="token" id="token">${accessToken}</div>
            <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('token').textContent); this.textContent='Copied!';">
              Copy Token
            </button>
          </div>
          <p class="warning">⚠️ Token expires: ${expirationDate.toLocaleDateString()} (${Math.round(expiresIn / 86400)} days)</p>
          
          <h2>Your LinkedIn User ID</h2>
          <div class="token-box">
            <div class="token" id="urn">${userUrn}</div>
            <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('urn').textContent); this.textContent='Copied!';">
              Copy ID
            </button>
          </div>
          
          <h2>Add to Environment Variables</h2>
          <p>Add these to your <code>.env.local</code> file (and Render dashboard for production):</p>
          <div class="env-example">
LINKEDIN_ACCESS_TOKEN=${accessToken}
LINKEDIN_USER_ID=${userUrn}
          </div>
          
          <p style="margin-top: 30px; color: #888;">You can close this window now.</p>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("LinkedIn OAuth error:", err);
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; background: #0D0D0D; color: white; }
            .error { background: #FF4500; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Error</h1>
          <div class="error">${err instanceof Error ? err.message : "Unknown error occurred"}</div>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  }
}
