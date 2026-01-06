import { NextRequest, NextResponse } from "next/server";
import { recordClick } from "@/lib/links/manager";
import crypto from "crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const shortCode = params.code;

  // Get click data
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : "unknown";
  const ipHash = crypto
    .createHash("sha256")
    .update(ip)
    .digest("hex")
    .substring(0, 16);

  const result = await recordClick(shortCode, {
    ipHash,
    userAgent: request.headers.get("user-agent") || undefined,
    referer: request.headers.get("referer") || undefined,
  });

  if (!result) {
    // Link not found or expired - redirect to home
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(result.destinationUrl);
}



