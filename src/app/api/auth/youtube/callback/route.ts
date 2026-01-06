import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/youtube/callback
 * Handles OAuth callback from Google, exchanges code for tokens
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>YouTube Auth Error</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; background: #0D0D0D; color: white; }
            .error { background: #FF4500; padding: 20px; border-radius: 8px; }
            h1 { color: #FF4500; }
          </style>
        </head>
        <body>
          <h1>YouTube Authorization Failed</h1>
          <div class="error">
            <strong>Error:</strong> ${error}
          </div>
          <p>Please try again or check your Google Cloud Console settings.</p>
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
          <title>YouTube Auth Error</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; background: #0D0D0D; color: white; }
            .error { background: #FF4500; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Missing Authorization Code</h1>
          <div class="error">No authorization code received from Google.</div>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || 
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://content-refinery-07dc.onrender.com'}/api/auth/youtube/callback`;

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
          <div class="error">YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET not configured in environment.</div>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Exchange code for tokens
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
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
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in; // seconds (usually 3600)

    // Get channel info
    let channelInfo = { title: "Unknown", id: "Unknown" };
    try {
      const channelResponse = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const channelData = await channelResponse.json();
      if (channelData.items && channelData.items.length > 0) {
        channelInfo = {
          title: channelData.items[0].snippet.title,
          id: channelData.items[0].id,
        };
      }
    } catch (e) {
      console.error("Failed to get channel info:", e);
    }

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>YouTube Connected!</title>
          <style>
            body { font-family: system-ui; max-width: 700px; margin: 50px auto; padding: 20px; background: #0D0D0D; color: white; }
            .success { background: #10B981; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .token-box { background: #1A1A1A; padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid #2A2A2A; }
            .token { font-family: monospace; word-break: break-all; background: #0D0D0D; padding: 15px; border-radius: 4px; font-size: 12px; }
            .copy-btn { background: #FF4500; border: none; color: white; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 10px; }
            .copy-btn:hover { background: #FF5722; }
            h2 { color: #F4A300; margin-top: 30px; }
            .warning { color: #F4A300; font-size: 14px; }
            .info { color: #10B981; font-size: 14px; }
            .env-example { background: #1A1A1A; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 13px; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1 style="margin: 0;">✅ YouTube Connected!</h1>
          </div>
          
          <p>Successfully connected to channel: <strong>${channelInfo.title}</strong></p>
          
          <h2>Refresh Token (IMPORTANT - Save This!)</h2>
          <div class="token-box">
            <div class="token" id="refresh">${refreshToken || "NOT PROVIDED - You may need to revoke access and re-authorize"}</div>
            <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('refresh').textContent); this.textContent='Copied!';">
              Copy Refresh Token
            </button>
          </div>
          <p class="info">✓ Refresh tokens don't expire - use this for long-term access</p>
          ${!refreshToken ? '<p class="warning">⚠️ No refresh token received. Go to <a href="https://myaccount.google.com/permissions" style="color: #FF4500;">Google Account Permissions</a>, revoke access to this app, then try again.</p>' : ''}
          
          <h2>Access Token (Temporary)</h2>
          <div class="token-box">
            <div class="token" id="access">${accessToken}</div>
            <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('access').textContent); this.textContent='Copied!';">
              Copy Access Token
            </button>
          </div>
          <p class="warning">⚠️ Access token expires in ${Math.round(expiresIn / 60)} minutes - the app will auto-refresh using the refresh token</p>
          
          <h2>Channel ID</h2>
          <div class="token-box">
            <div class="token" id="channel">${channelInfo.id}</div>
            <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('channel').textContent); this.textContent='Copied!';">
              Copy Channel ID
            </button>
          </div>
          
          <h2>Add to Environment Variables</h2>
          <p>Add these to your <code>.env.local</code> file (and Render dashboard for production):</p>
          <div class="env-example">
YOUTUBE_CLIENT_ID=${clientId}
YOUTUBE_CLIENT_SECRET=${clientSecret}
YOUTUBE_REFRESH_TOKEN=${refreshToken || "MISSING"}
YOUTUBE_CHANNEL_ID=${channelInfo.id}
          </div>
          
          <p style="margin-top: 30px; color: #888;">You can close this window now.</p>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("YouTube OAuth error:", err);
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
