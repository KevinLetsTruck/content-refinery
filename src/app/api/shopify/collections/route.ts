import { NextResponse } from "next/server";

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN || "store-letstruck.myshopify.com";
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!SHOPIFY_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "Shopify access token not configured" },
        { status: 500 }
      );
    }

    // Fetch both custom collections and smart collections
    const [customRes, smartRes] = await Promise.all([
      fetch(`https://${SHOPIFY_STORE}/admin/api/2024-01/custom_collections.json`, {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }),
      fetch(`https://${SHOPIFY_STORE}/admin/api/2024-01/smart_collections.json`, {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }),
    ]);

    const customData = customRes.ok ? await customRes.json() : { custom_collections: [] };
    const smartData = smartRes.ok ? await smartRes.json() : { smart_collections: [] };

    const collections = [
      ...(customData.custom_collections || []),
      ...(smartData.smart_collections || []),
    ].sort((a, b) => a.title.localeCompare(b.title));

    console.log(`[Shopify] Fetched ${collections.length} collections`);

    return NextResponse.json({ collections });
  } catch (error) {
    console.error("[Shopify] Collections error:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

