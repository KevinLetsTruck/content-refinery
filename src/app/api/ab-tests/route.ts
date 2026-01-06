import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { 
  createABTest, 
} from "@/lib/analytics/ab-testing";

// GET /api/ab-tests - List all tests
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  
  const tests = await prisma.aBTest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  
  return NextResponse.json({ tests });
}

// POST /api/ab-tests - Create new test
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      extractionId,
      sourceText,
      platform,
      pillar,
      objective,
      testVariable,
      numVariants,
      name,
    } = body;
    
    if (!extractionId || !sourceText || !platform || !pillar || !objective || !testVariable) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    const result = await createABTest({
      name,
      extractionId,
      sourceText,
      platform,
      pillar,
      objective,
      testVariable,
      numVariants,
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error("[AB Test] Creation error:", error);
    return NextResponse.json(
      { error: "Failed to create test" },
      { status: 500 }
    );
  }
}




