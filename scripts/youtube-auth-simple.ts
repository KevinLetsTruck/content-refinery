#!/usr/bin/env npx ts-node
/**
 * YouTube OAuth2 Helper Script (Non-interactive)
 *
 * Uses credentials from .env.local to get a refresh token.
 *
 * Usage:
 *   npx ts-node scripts/youtube-auth-simple.ts
 */

import * as http from "http";
import * as url from "url";
import * as fs from "fs";
import * as path from "path";

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const CLIENT_ID = envVars.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = envVars.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3333/callback";
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET in .env.local");
  process.exit(1);
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
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

Using credentials from .env.local:
- Client ID: ${CLIENT_ID.substring(0, 20)}...
- Client Secret: ${CLIENT_SECRET.substring(0, 10)}...
`);

  // Build authorization URL
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

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

    const tokens = await exchangeCodeForTokens(code);

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    🎉 SUCCESS! Here's your refresh token:      ║
╚════════════════════════════════════════════════════════════════╝

YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Add this to your .env.local file!
`);

  } catch (error) {
    console.error("\n❌ Authorization failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
