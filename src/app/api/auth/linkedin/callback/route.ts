import { NextRequest, NextResponse } from "next/server";

/**
 * LinkedIn OAuth Callback
 *
 * Exchanges authorization code for access token
 * After authorizing, displays the token for manual copy to env vars
 */

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || "77i43rvbnibn78";
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI ||
  "https://content-refinery-07dc.onrender.com/api/auth/linkedin/callback";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle errors from LinkedIn
  if (error) {
    return new NextResponse(
      `<html>
        <head><title>LinkedIn Auth Error</title></head>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">LinkedIn Authorization Failed</h1>
          <p><strong>Error:</strong> ${error}</p>
          <p><strong>Description:</strong> ${errorDescription || "Unknown error"}</p>
          <p><a href="/api/auth/linkedin">Try again</a></p>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // No code means direct access - show info
  if (!code) {
    return new NextResponse(
      `<html>
        <head><title>LinkedIn OAuth Setup</title></head>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1>LinkedIn OAuth Callback</h1>
          <p>This endpoint receives the OAuth callback from LinkedIn.</p>
          <p><a href="/api/auth/linkedin">Start LinkedIn Authorization</a></p>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Check for client secret
  if (!LINKEDIN_CLIENT_SECRET) {
    return new NextResponse(
      `<html>
        <head><title>Configuration Error</title></head>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Configuration Error</h1>
          <p>LINKEDIN_CLIENT_SECRET environment variable is not set.</p>
          <p>Add it to your Render environment variables and redeploy.</p>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(JSON.stringify(errorData));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in; // Usually 60 days

    // Calculate expiry date
    const expiryDate = new Date(Date.now() + expiresIn * 1000);

    // Get user info to confirm it worked
    // Try /userinfo first (works with openid scope)
    let userName = "Unknown";
    let userId = "";

    const userinfoResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (userinfoResponse.ok) {
      const userinfoData = await userinfoResponse.json();
      userName = userinfoData.name || `${userinfoData.given_name} ${userinfoData.family_name}`;
      userId = userinfoData.sub; // This is the LinkedIn member ID
    } else {
      // Fallback to /me endpoint (works with r_liteprofile scope)
      const userResponse = await fetch("https://api.linkedin.com/v2/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        userName = `${userData.localizedFirstName} ${userData.localizedLastName}`;
        userId = userData.id;
      }
    }

    // Display success page with token
    return new NextResponse(
      `<html>
        <head>
          <title>LinkedIn Connected!</title>
          <style>
            body { font-family: system-ui; padding: 40px; max-width: 700px; margin: 0 auto; background: #0d0d0d; color: #fff; }
            h1 { color: #22c55e; }
            .token-box { background: #1a1a1a; border: 1px solid #333; padding: 20px; border-radius: 8px; margin: 20px 0; word-break: break-all; }
            .token { font-family: monospace; font-size: 12px; color: #ff4500; }
            .info { color: #888; margin: 10px 0; }
            .warning { background: #422006; border: 1px solid #854d0e; padding: 15px; border-radius: 8px; margin: 20px 0; }
            code { background: #333; padding: 2px 6px; border-radius: 4px; }
            button { background: #ff4500; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 10px; }
            button:hover { background: #cc3700; }
          </style>
        </head>
        <body>
          <h1>✅ LinkedIn Connected!</h1>
          <p>Successfully authorized as <strong>${userName}</strong></p>

          <div class="token-box">
            <p style="margin: 0 0 10px 0; color: #888;">Access Token:</p>
            <p class="token" id="token">${accessToken}</p>
            <button onclick="navigator.clipboard.writeText('${accessToken}'); this.textContent='Copied!';">
              Copy Token
            </button>
          </div>

          <div class="info">
            <p><strong>User ID:</strong> ${userId}</p>
            <p><strong>Expires:</strong> ${expiryDate.toLocaleDateString()} (${Math.floor(expiresIn / 86400)} days)</p>
          </div>

          <div class="warning">
            <p><strong>⚠️ Next Step:</strong></p>
            <p>Add this token to your Render environment variables:</p>
            <p><code>LINKEDIN_ACCESS_TOKEN</code> = (the token above)</p>
            <p><code>LINKEDIN_USER_ID</code> = ${userId}</p>
          </div>

          <p style="margin-top: 30px;">
            <a href="https://dashboard.render.com/web/srv-d5cl2uili9vc73co4f5g/env"
               style="color: #ff4500;" target="_blank">
              → Open Render Environment Variables
            </a>
          </p>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("[LinkedIn] OAuth error:", error);
    return new NextResponse(
      `<html>
        <head><title>OAuth Error</title></head>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">OAuth Error</h1>
          <p>Failed to exchange code for access token.</p>
          <pre style="background: #f5f5f5; padding: 15px; overflow: auto;">${error instanceof Error ? error.message : String(error)}</pre>
          <p><a href="/api/auth/linkedin">Try again</a></p>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
}
