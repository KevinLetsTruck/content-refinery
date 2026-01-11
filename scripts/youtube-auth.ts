#!/usr/bin/env npx ts-node
/**
 * YouTube OAuth2 Helper Script
 *
 * This script helps you get a YouTube refresh token for the Content Refinery app.
 *
 * Prerequisites:
 * 1. Go to Google Cloud Console: https://console.cloud.google.com/
 * 2. Create a new project (or select existing)
 * 3. Enable "YouTube Data API v3"
 * 4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
 * 5. Choose "Web application"
 * 6. Add "http://localhost:3333/callback" as an authorized redirect URI
 * 7. Copy your Client ID and Client Secret
 *
 * Usage:
 *   npx ts-node scripts/youtube-auth.ts
 *
 * Then follow the prompts.
 */

import * as http from "http";
import * as url from "url";
import * as readline from "readline";

const REDIRECT_URI = "http://localhost:3333/callback";
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

async function startCallbackServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url || "", true);

      if (parsedUrl.pathname === "/callback") {
        const code = parsedUrl.query.code as string;
        const error = parsedUrl.query.error as string;

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1 style="color: #dc2626;">❌ Authorization Failed</h1>
                <p>Error: ${error}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          server.close();
          reject(new Error(error));
          return;
        }

        if (code) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1 style="color: #16a34a;">✅ Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
              </body>
            </html>
          `);
          server.close();
          resolve(code);
          return;
        }
      }

      res.writeHead(404);
      res.end("Not found");
    });

    server.listen(3333, () => {
      console.log("\n📡 Callback server started on http://localhost:3333");
    });

    server.on("error", (err) => {
      reject(err);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Timeout waiting for OAuth callback"));
    }, 5 * 60 * 1000);
  });
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           YouTube OAuth2 Setup for Content Refinery            ║
╚════════════════════════════════════════════════════════════════╝

This script will help you get a YouTube refresh token.

Prerequisites:
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create/select a project and enable "YouTube Data API v3"
3. Create OAuth 2.0 credentials (Web application type)
4. Add this redirect URI: ${REDIRECT_URI}
`);

  // Get credentials from user
  const clientId = await prompt("Enter your YouTube Client ID: ");
  if (!clientId) {
    console.error("❌ Client ID is required");
    process.exit(1);
  }

  const clientSecret = await prompt("Enter your YouTube Client Secret: ");
  if (!clientSecret) {
    console.error("❌ Client Secret is required");
    process.exit(1);
  }

  // Build authorization URL
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent"); // Force refresh token

  console.log(`
🔗 Opening authorization URL in your browser...

If it doesn't open automatically, visit:
${authUrl.toString()}
`);

  // Try to open browser
  const openCommand = process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
      ? "start"
      : "xdg-open";

  const { exec } = await import("child_process");
  exec(`${openCommand} "${authUrl.toString()}"`);

  // Wait for callback
  console.log("⏳ Waiting for authorization...\n");

  try {
    const code = await startCallbackServer();
    console.log("\n✅ Authorization code received!");
    console.log("🔄 Exchanging code for tokens...\n");

    const tokens = await exchangeCodeForTokens(code, clientId, clientSecret);

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    🎉 SUCCESS! Here are your credentials:      ║
╚════════════════════════════════════════════════════════════════╝

Add these to your .env.local or Render environment:

YOUTUBE_CLIENT_ID=${clientId}
YOUTUBE_CLIENT_SECRET=${clientSecret}
YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  IMPORTANT: Save these credentials securely!
    The refresh token won't be shown again.

📋 Copy the lines above to your .env.local file.
`);

  } catch (error) {
    console.error("\n❌ Authorization failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
