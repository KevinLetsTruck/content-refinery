import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { analyzeABTest, startABTest } from "@/lib/analytics/ab-testing";

// GET /api/ab-tests/[id] - Get test details and analysis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const test = await prisma.aBTest.findUnique({
    where: { id },
    include: {
      posts: true,
    },
  });
  
  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }
  
  // Get current analysis
  const analysis = await analyzeABTest(id);
  
  return NextResponse.json({
    test,
    analysis,
  });
}

// PATCH /api/ab-tests/[id] - Update test (start, complete, cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case "start":
        await startABTest(id);
        break;
        
      case "analyze":
        const analysis = await analyzeABTest(id);
        return NextResponse.json({ analysis });
        
      case "cancel":
        await prisma.aBTest.update({
          where: { id },
          data: { status: "cancelled" },
        });
        break;
        
      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
    
    const updated = await prisma.aBTest.findUnique({
      where: { id },
    });
    
    return NextResponse.json({ test: updated });
    
  } catch (error) {
    console.error("[AB Test] Update error:", error);
    return NextResponse.json(
      { error: "Failed to update test" },
      { status: 500 }
    );
  }
}



