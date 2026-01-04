import { NextRequest, NextResponse } from "next/server";

// Support both SHOPIFY_STORE (short name) and SHOPIFY_STORE_DOMAIN (full domain)
const SHOPIFY_STORE_NAME = process.env.SHOPIFY_STORE || "store-letstruck";
const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN || `${SHOPIFY_STORE_NAME}.myshopify.com`;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("collection_id");
    const limit = searchParams.get("limit") || "50";

    if (!SHOPIFY_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "Shopify access token not configured. Add SHOPIFY_ACCESS_TOKEN to environment variables." },
        { status: 500 }
      );
    }

    let url = `https://${SHOPIFY_STORE}/admin/api/2024-01/products.json?limit=${limit}&status=active`;
    
    if (collectionId) {
      url = `https://${SHOPIFY_STORE}/admin/api/2024-01/collections/${collectionId}/products.json?limit=${limit}`;
    }

    console.log(`[Shopify] Fetching products from: ${url}`);

    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Shopify] API error:", response.status, error);
      return NextResponse.json(
        { error: `Shopify API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Shopify] Fetched ${data.products?.length || 0} products`);
    
    return NextResponse.json({ products: data.products || [] });
  } catch (error) {
    console.error("[Shopify] Products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

