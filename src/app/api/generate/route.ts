import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { generateBulkContent, Platform } from "@/lib/ai/claude";

// POST /api/generate - Generate platform content from an extraction
export async function POST(request: NextRequest) {
  try {
    const { extractionId, platforms } = await request.json();

    if (!extractionId) {
      return NextResponse.json(
        { error: "extractionId is required" },
        { status: 400 }
      );
    }

    const targetPlatforms: Platform[] = platforms || [
      "twitter",
      "instagram", 
      "facebook",
      "linkedin",
    ];

    // Get the extraction
    const extraction = await prisma.extraction.findUnique({
      where: { id: extractionId },
    });

    if (!extraction) {
      return NextResponse.json(
        { error: "Extraction not found" },
        { status: 404 }
      );
    }

    // Get related products if any are mentioned
    let products: { name: string; url: string }[] = [];
    if (extraction.productIds && extraction.productIds.length > 0) {
      const productData = await prisma.product.findMany({
        where: {
          shopifyId: { in: extraction.productIds },
        },
        select: {
          title: true,
          url: true,
        },
      });
      products = productData.map((p) => ({ name: p.title, url: p.url }));
    }

    // Generate content for each platform
    console.log(`Generating content for extraction ${extractionId}...`);
    const generatedContent = await generateBulkContent(
      {
        type: extraction.type as any,
        text: extraction.text,
        startTime: extraction.startTime ? Number(extraction.startTime) : undefined,
        endTime: extraction.endTime ? Number(extraction.endTime) : undefined,
        confidence: Number(extraction.confidence),
      },
      targetPlatforms,
      products
    );

    // Save generated content
    const savedContent = await prisma.generatedContent.createMany({
      data: generatedContent.map((content) => ({
        extractionId,
        platform: content.platform,
        text: content.text,
        hashtags: content.hashtags || [],
        mediaGuidance: content.mediaGuidance,
        status: "pending_review",
      })),
    });

    // Fetch created content
    const createdContent = await prisma.generatedContent.findMany({
      where: { extractionId },
      orderBy: { createdAt: "desc" },
      take: targetPlatforms.length,
    });

    // Mark extraction as used
    await prisma.extraction.update({
      where: { id: extractionId },
      data: { isUsed: true },
    });

    return NextResponse.json({
      message: `Generated ${createdContent.length} content pieces`,
      content: createdContent,
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}

// PUT /api/generate - Bulk generate content for multiple extractions
export async function PUT(request: NextRequest) {
  try {
    const { extractionIds, platforms } = await request.json();

    if (!extractionIds || !Array.isArray(extractionIds)) {
      return NextResponse.json(
        { error: "extractionIds array is required" },
        { status: 400 }
      );
    }

    const targetPlatforms: Platform[] = platforms || [
      "twitter",
      "instagram",
      "facebook",
      "linkedin",
    ];

    // Get all extractions
    const extractions = await prisma.extraction.findMany({
      where: { id: { in: extractionIds } },
    });

    if (!extractions || extractions.length === 0) {
      return NextResponse.json(
        { error: "No extractions found" },
        { status: 404 }
      );
    }

    // Get all products for potential linking
    const products = await prisma.product.findMany({
      select: {
        shopifyId: true,
        title: true,
        url: true,
      },
    });
    const productMap = new Map(
      products.map((p) => [p.shopifyId, { name: p.title, url: p.url }])
    );

    let totalGenerated = 0;
    const allContent: any[] = [];

    // Generate for each extraction
    for (const extraction of extractions) {
      const relatedProducts = (extraction.productIds || [])
        .map((id) => productMap.get(id))
        .filter(Boolean) as { name: string; url: string }[];

      const generatedContent = await generateBulkContent(
        {
          type: extraction.type as any,
          text: extraction.text,
          startTime: extraction.startTime ? Number(extraction.startTime) : undefined,
          endTime: extraction.endTime ? Number(extraction.endTime) : undefined,
          confidence: Number(extraction.confidence),
        },
        targetPlatforms,
        relatedProducts
      );

      for (const content of generatedContent) {
        const saved = await prisma.generatedContent.create({
          data: {
            extractionId: extraction.id,
            platform: content.platform,
            text: content.text,
            hashtags: content.hashtags || [],
            mediaGuidance: content.mediaGuidance,
            status: "pending_review",
          },
        });
        allContent.push(saved);
        totalGenerated++;
      }
    }

    // Mark all extractions as used
    await prisma.extraction.updateMany({
      where: { id: { in: extractionIds } },
      data: { isUsed: true },
    });

    return NextResponse.json({
      message: `Generated ${totalGenerated} content pieces from ${extractions.length} extractions`,
      content: allContent,
    });
  } catch (error) {
    console.error("Bulk generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk generation failed" },
      { status: 500 }
    );
  }
}
