import { NextResponse } from 'next/server';

export async function GET() {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json({ error: 'No LinkedIn access token configured' }, { status: 400 });
  }

  const results: Record<string, unknown> = {};

  // Try userinfo endpoint (OpenID Connect)
  try {
    const userinfoResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const userinfoData = await userinfoResponse.json();
    results.userinfo = {
      status: userinfoResponse.status,
      data: userinfoData,
    };
  } catch (e) {
    results.userinfo = { error: String(e) };
  }

  // Try /me endpoint
  try {
    const meResponse = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    const meData = await meResponse.json();
    results.me = {
      status: meResponse.status,
      data: meData,
    };
  } catch (e) {
    results.me = { error: String(e) };
  }

  return NextResponse.json(results);
}
