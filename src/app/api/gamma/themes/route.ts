import { NextResponse } from "next/server";
import { GammaClient } from "@/lib/gamma/client";
import { LETSTRUCK_THEME_ID } from "@/lib/gamma/brand-rules";

/**
 * GET /api/gamma/themes
 * List available Gamma themes
 */
export async function GET() {
  try {
    if (!process.env.GAMMA_API_KEY) {
      return NextResponse.json(
        { error: "Gamma API key not configured" },
        { status: 500 }
      );
    }

    const gamma = new GammaClient();
    const themes = await gamma.listThemes();

    return NextResponse.json({
      themes,
      defaultThemeId: LETSTRUCK_THEME_ID,
    });

  } catch (error) {
    console.error("[Gamma] List themes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
