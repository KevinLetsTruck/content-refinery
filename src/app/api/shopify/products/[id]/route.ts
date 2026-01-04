import { NextRequest, NextResponse } from "next/server";

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN || "store-letstruck.myshopify.com";
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!SHOPIFY_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "Shopify access token not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/2024-01/products/${id}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ product: data.product });
  } catch (error) {
    console.error("[Shopify] Product error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

