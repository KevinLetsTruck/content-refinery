import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "@/lib/products/catalog";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/products/:id
 * Get a specific product by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const product = getProductById(id);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("[Products] Get error:", error);
    return NextResponse.json(
      { error: "Failed to get product" },
      { status: 500 }
    );
  }
}
