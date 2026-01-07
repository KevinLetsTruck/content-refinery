import { NextRequest, NextResponse } from "next/server";
import { getConstantContactClient } from "@/lib/constant-contact/client";

/**
 * GET /api/constantcontact/lists
 * Get all contact lists
 */
export async function GET() {
  try {
    const client = getConstantContactClient();
    
    if (!client.isAuthenticated()) {
      return NextResponse.json(
        { error: "Not connected to Constant Contact" },
        { status: 401 }
      );
    }

    const lists = await client.getLists();

    return NextResponse.json({
      total: lists.length,
      lists: lists.map(l => ({
        id: l.list_id,
        name: l.name,
        description: l.description,
        memberCount: l.membership_count,
        favorite: l.favorite,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
      })),
    });
  } catch (error) {
    console.error("[CC API] Get lists error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get lists" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/constantcontact/lists
 * Create a new contact list
 */
export async function POST(request: NextRequest) {
  try {
    const client = getConstantContactClient();
    
    if (!client.isAuthenticated()) {
      return NextResponse.json(
        { error: "Not connected to Constant Contact" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "List name is required" },
        { status: 400 }
      );
    }

    const list = await client.createList(name, description);

    return NextResponse.json({
      success: true,
      list: {
        id: list.list_id,
        name: list.name,
        description: list.description,
      },
    });
  } catch (error) {
    console.error("[CC API] Create list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create list" },
      { status: 500 }
    );
  }
}
