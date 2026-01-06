import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/youtube
 * Initiates YouTube/Google OAuth flow
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || 
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://content-refinery-07dc.onrender.com'}/api/auth/youtube/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "YOUTUBE_CLIENT_ID not configured" },
      { status: 500 }
    );
  }

  // Scopes needed for uploading videos
  const scopes = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.readonly",
  ].join(" ");

  // Generate state for CSRF protection
  const state = Math.random().toString(36).substring(7);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("access_type", "offline"); // Gets refresh token
  authUrl.searchParams.set("prompt", "consent"); // Force consent to get refresh token
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
