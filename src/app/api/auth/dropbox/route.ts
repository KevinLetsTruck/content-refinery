import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

/**
 * Dropbox OAuth 2.0 Flow
 *
 * Step 1: GET /api/auth/dropbox - Redirect to Dropbox authorization
 * Step 2: GET /api/auth/dropbox?code=xxx - Handle callback and store tokens
 */

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
const DROPBOX_REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI ||
  (process.env.NODE_ENV === "production"
    ? "https://content-refinery.onrender.com/api/auth/dropbox"
    : "http://localhost:3000/api/auth/dropbox");

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");
  const folderPath = searchParams.get("folder") || "/";

  // Check if Dropbox is configured
  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
    return NextResponse.json(
      { error: "Dropbox is not configured. Set DROPBOX_APP_KEY and DROPBOX_APP_SECRET." },
      { status: 500 }
    );
  }

  // Handle error from Dropbox
  if (error) {
    console.error("[Dropbox OAuth] Error:", error);
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Step 2: Handle callback with authorization code
  if (code) {
    try {
      // Exchange code for access token
      const tokenResponse = await fetch("https://api.dropboxapi.com/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          client_id: DROPBOX_APP_KEY,
          client_secret: DROPBOX_APP_SECRET,
          redirect_uri: DROPBOX_REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error("[Dropbox OAuth] Token exchange error:", errorData);
        throw new Error(errorData.error_description || "Failed to exchange code for token");
      }

      const tokenData = await tokenResponse.json();
      console.log("[Dropbox OAuth] Token received, expires_in:", tokenData.expires_in);

      // Get folder path from state (passed through OAuth flow)
      const decodedState = state ? JSON.parse(Buffer.from(state, "base64").toString()) : {};
      const configuredFolderPath = decodedState.folderPath || "/";

      // Store credentials in database
      await prisma.platformCredential.upsert({
        where: { platform: "dropbox" },
        update: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          expiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : null,
          metadata: {
            folderPath: configuredFolderPath,
            accountId: tokenData.account_id,
            uid: tokenData.uid,
            scope: tokenData.scope,
          },
        },
        create: {
          platform: "dropbox",
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          expiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : null,
          metadata: {
            folderPath: configuredFolderPath,
            accountId: tokenData.account_id,
            uid: tokenData.uid,
            scope: tokenData.scope,
          },
        },
      });

      console.log("[Dropbox OAuth] Credentials stored successfully");

      // Redirect to settings page with success message
      return NextResponse.redirect(
        new URL("/settings/integrations?success=dropbox", request.url)
      );
    } catch (err) {
      console.error("[Dropbox OAuth] Error:", err);
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${encodeURIComponent(err instanceof Error ? err.message : "Unknown error")}`, request.url)
      );
    }
  }

  // Step 1: Redirect to Dropbox authorization
  const state_data = Buffer.from(JSON.stringify({ folderPath })).toString("base64");

  const authUrl = new URL("https://www.dropbox.com/oauth2/authorize");
  authUrl.searchParams.set("client_id", DROPBOX_APP_KEY);
  authUrl.searchParams.set("redirect_uri", DROPBOX_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("token_access_type", "offline"); // Get refresh token
  authUrl.searchParams.set("state", state_data);

  return NextResponse.redirect(authUrl.toString());
}

/**
 * DELETE /api/auth/dropbox - Disconnect Dropbox
 */
export async function DELETE() {
  try {
    // Get current credentials to revoke token
    const credentials = await prisma.platformCredential.findUnique({
      where: { platform: "dropbox" },
    });

    if (credentials) {
      // Revoke the token at Dropbox
      try {
        await fetch("https://api.dropboxapi.com/2/auth/token/revoke", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
          },
        });
      } catch {
        // Ignore revoke errors, continue with deletion
      }

      // Delete from database
      await prisma.platformCredential.delete({
        where: { platform: "dropbox" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Dropbox] Disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Dropbox" },
      { status: 500 }
    );
  }
}
