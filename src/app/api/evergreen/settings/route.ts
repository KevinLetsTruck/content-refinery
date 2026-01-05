import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// GET settings
export async function GET() {
  try {
    const settings = await prisma.evergreenSettings.findMany();

    // Return defaults if no settings exist
    if (settings.length === 0) {
      return NextResponse.json({
        settings: [
          {
            platform: "twitter",
            enabled: true,
            minDaysBetween: 14,
            maxResharesPerDay: 2,
            preferredTimes: ["09:00", "14:00"],
          },
          {
            platform: "facebook",
            enabled: true,
            minDaysBetween: 21,
            maxResharesPerDay: 1,
            preferredTimes: ["10:00"],
          },
          {
            platform: "instagram",
            enabled: false,
            minDaysBetween: 30,
            maxResharesPerDay: 1,
            preferredTimes: ["12:00"],
          },
        ],
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[Evergreen Settings] Get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// POST/PUT update settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      platform,
      enabled,
      minDaysBetween,
      maxResharesPerDay,
      preferredTimes,
    } = body;

    if (!platform) {
      return NextResponse.json(
        { error: "platform required" },
        { status: 400 }
      );
    }

    const settings = await prisma.evergreenSettings.upsert({
      where: { platform },
      update: {
        enabled: enabled ?? true,
        minDaysBetween: minDaysBetween ?? 14,
        maxResharesPerDay: maxResharesPerDay ?? 2,
        preferredTimes: preferredTimes ?? [],
      },
      create: {
        platform,
        enabled: enabled ?? true,
        minDaysBetween: minDaysBetween ?? 14,
        maxResharesPerDay: maxResharesPerDay ?? 2,
        preferredTimes: preferredTimes ?? [],
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("[Evergreen Settings] Update error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

