import { NextRequest, NextResponse } from "next/server";
import { recordConversion } from "@/lib/links/manager";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    // Verify Shopify webhook
    const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
    const body = await request.text();

    if (!verifyShopifyWebhook(body, hmacHeader)) {
      console.error("[Shopify Webhook] Invalid HMAC signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = JSON.parse(body);

    // Extract UTM params from landing_site or note_attributes
    const landingSite = order.landing_site || "";
    let utmSource: string | undefined;
    let utmMedium: string | undefined;
    let utmCampaign: string | undefined;
    let utmContent: string | undefined;

    try {
      const url = new URL(landingSite, "https://example.com");
      utmSource = url.searchParams.get("utm_source") || undefined;
      utmMedium = url.searchParams.get("utm_medium") || undefined;
      utmCampaign = url.searchParams.get("utm_campaign") || undefined;
      utmContent = url.searchParams.get("utm_content") || undefined;
    } catch {
      // Invalid URL, skip UTM extraction
    }

    // Record conversion
    await recordConversion({
      orderId: order.id.toString(),
      orderValue: parseFloat(order.total_price),
      productIds: order.line_items.map((item: { product_id: number }) =>
        item.product_id.toString()
      ),
      customerEmail: order.customer?.email,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
    });

    console.log(`[Shopify Webhook] Recorded conversion for order ${order.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Shopify Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

function verifyShopifyWebhook(body: string, hmac: string | null): boolean {
  if (!hmac || !process.env.SHOPIFY_WEBHOOK_SECRET) {
    // Allow in development without secret
    if (process.env.NODE_ENV === "development") {
      console.warn("[Shopify Webhook] Skipping HMAC verification in development");
      return true;
    }
    return false;
  }

  const hash = crypto
    .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(body, "utf8")
    .digest("base64");

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(hash));
  } catch {
    return false;
  }
}




