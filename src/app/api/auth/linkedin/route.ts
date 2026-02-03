import { NextResponse } from "next/server";

/**
 * LinkedIn OAuth Start
 *
 * Redirects user to LinkedIn authorization page
 */

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || "77i43rvbnibn78";
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI ||
  "https://content-refinery-07dc.onrender.com/api/auth/linkedin/callback";

// Scopes needed for posting
// - w_member_social: Post to LinkedIn (from "Share on LinkedIn" product)
// - openid, profile: Get user ID (from "Sign In with LinkedIn using OpenID Connect" product)
const SCOPES = ["openid", "profile", "w_member_social"];

export async function GET() {
  const state = Math.random().toString(36).substring(7);

  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", LINKEDIN_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
