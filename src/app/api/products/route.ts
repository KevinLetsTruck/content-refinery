import { NextRequest, NextResponse } from "next/server";
import {
  PRODUCT_CATALOG,
  getProductById,
  getRecommendedProducts,
  getProductsByCategory,
  getKevinsDailyStack,
  searchProducts,
  Product,
} from "@/lib/products/catalog";

/**
 * GET /api/products
 * List products from the catalog
 *
 * Query params:
 * - category: Filter by category
 * - leadMagnetSlug: Get recommended products for a lead magnet
 * - kevinsDaily: If "true", return Kevin's daily stack only
 * - search: Search products by name
 * - limit: Max number of products to return
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as Product["category"] | null;
    const leadMagnetSlug = searchParams.get("leadMagnetSlug");
    const kevinsDaily = searchParams.get("kevinsDaily");
    const search = searchParams.get("search");
    const limitStr = searchParams.get("limit");
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    let products: Product[];

    // Filter by different criteria
    if (kevinsDaily === "true") {
      products = getKevinsDailyStack();
    } else if (leadMagnetSlug) {
      products = getRecommendedProducts(leadMagnetSlug);
    } else if (category) {
      products = getProductsByCategory(category);
    } else if (search) {
      products = searchProducts(search);
    } else {
      products = [...PRODUCT_CATALOG];
    }

    // Apply limit
    if (limit && limit > 0) {
      products = products.slice(0, limit);
    }

    return NextResponse.json({
      products,
      total: products.length,
      categories: [
        "supplement",
        "food",
        "equipment",
        "testing",
        "trucking",
        "program",
      ],
    });
  } catch (error) {
    console.error("[Products] List error:", error);
    return NextResponse.json(
      { error: "Failed to list products" },
      { status: 500 }
    );
  }
}
