import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { randomBytes } from "crypto";

// Generate a secure API key
function generateApiKey(): string {
  return `cr_${randomBytes(24).toString("hex")}`;
}

// ============================================
// GET /api/apps - List all source apps
// ============================================

export async function GET() {
  try {
    const apps = await prisma.sourceApp.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        voiceProfile: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { sources: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json({ apps });
    
  } catch (error) {
    console.error("[Apps] Error listing apps:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/apps - Create a new source app
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, displayName, voiceProfile, webhookUrl } = body;
    
    if (!name || !displayName) {
      return NextResponse.json(
        { error: "name and displayName are required" },
        { status: 400 }
      );
    }
    
    // Check if app already exists
    const existing = await prisma.sourceApp.findUnique({
      where: { name },
    });
    
    if (existing) {
      return NextResponse.json(
        { error: `App '${name}' already exists` },
        { status: 409 }
      );
    }
    
    // Generate API key
    const apiKey = generateApiKey();
    
    // Create app
    const app = await prisma.sourceApp.create({
      data: {
        name,
        displayName,
        apiKey,
        voiceProfile: voiceProfile || "kevin-health",
        webhookUrl,
      },
    });
    
    console.log(`[Apps] Created source app: ${app.name}`);
    
    // Return the API key (only shown once!)
    return NextResponse.json({
      success: true,
      app: {
        id: app.id,
        name: app.name,
        displayName: app.displayName,
        voiceProfile: app.voiceProfile,
      },
      apiKey: app.apiKey, // IMPORTANT: Save this! Only shown once.
      message: "Save this API key securely - it won't be shown again!",
    }, { status: 201 });
    
  } catch (error) {
    console.error("[Apps] Error creating app:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
