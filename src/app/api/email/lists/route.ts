import { NextRequest, NextResponse } from "next/server";
import { getConstantContactClient } from "@/lib/constant-contact/client";

/**
 * GET /api/email/lists
 * Get all Constant Contact lists
 */
export async function GET() {
  try {
    const ccClient = getConstantContactClient();

    // Check if authenticated
    const isAuth = await ccClient.isAuthenticated();
    if (!isAuth) {
      return NextResponse.json(
        {
          error: "Not authenticated with Constant Contact",
          authUrl: ccClient.getAuthorizationUrl(),
        },
        { status: 401 }
      );
    }

    const lists = await ccClient.getLists();

    return NextResponse.json({
      lists: lists.map((list) => ({
        id: list.list_id,
        name: list.name,
        description: list.description,
        memberCount: list.membership_count,
        createdAt: list.created_at,
        updatedAt: list.updated_at,
      })),
    });
  } catch (error) {
    console.error("[EmailLists] Get error:", error);
    return NextResponse.json(
      { error: "Failed to get email lists" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/email/lists
 * Create a new Constant Contact list
 *
 * Request body:
 * {
 *   name: string
 *   description?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "List name is required" },
        { status: 400 }
      );
    }

    const ccClient = getConstantContactClient();

    // Check if authenticated
    const isAuth = await ccClient.isAuthenticated();
    if (!isAuth) {
      return NextResponse.json(
        {
          error: "Not authenticated with Constant Contact",
          authUrl: ccClient.getAuthorizationUrl(),
        },
        { status: 401 }
      );
    }

    const list = await ccClient.createList(name, description);

    return NextResponse.json({
      success: true,
      list: {
        id: list.list_id,
        name: list.name,
        description: list.description,
        memberCount: list.membership_count,
        createdAt: list.created_at,
        updatedAt: list.updated_at,
      },
    });
  } catch (error) {
    console.error("[EmailLists] Create error:", error);
    return NextResponse.json(
      { error: "Failed to create email list" },
      { status: 500 }
    );
  }
}
