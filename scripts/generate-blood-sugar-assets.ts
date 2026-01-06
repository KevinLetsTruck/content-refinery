#!/usr/bin/env npx ts-node

/**
 * Generate Blood Sugar Campaign Assets via Gamma API
 * 
 * Run with: npx ts-node scripts/generate-blood-sugar-assets.ts
 */

const GAMMA_API_KEY = "sk-gamma-r8dhxiQCmvlhx2ju5ZKNWIGtclWIJnV1WZEqbmskCE";
const GAMMA_BASE_URL = "https://public-api.gamma.app/v1.0";

interface GenerationResponse {
  id: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  gammaUrl?: string;
  pdfUrl?: string;
  error?: string;
}

/**
 * Start a generation request
 */
async function startGeneration(payload: object): Promise<string> {
  const response = await fetch(`${GAMMA_BASE_URL}/generations`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GAMMA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to start generation: ${response.status} ${error}`);
  }

  const data = await response.json();
  console.log(`  ✓ Generation started with ID: ${data.id}`);
  return data.id;
}

/**
 * Poll for generation completion
 */
async function pollGeneration(generationId: string): Promise<GenerationResponse> {
  const maxAttempts = 60; // 3 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`${GAMMA_BASE_URL}/generations/${generationId}`, {
      headers: {
        "Authorization": `Bearer ${GAMMA_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to poll generation: ${response.status} ${error}`);
    }

    const data: GenerationResponse = await response.json();

    if (data.status === "completed") {
      return data;
    }

    if (data.status === "failed") {
      throw new Error(`Generation failed: ${data.error || "Unknown error"}`);
    }

    process.stdout.write(".");
    await sleep(3000); // Poll every 3 seconds
    attempts++;
  }

  throw new Error("Generation timed out after 3 minutes");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate the PDF Lead Magnet
 */
async function generatePDFLeadMagnet(): Promise<GenerationResponse> {
  console.log("\n📄 Generating PDF Lead Magnet: \"The Driver's Guide to Stable Blood Sugar\"");

  const payload = {
    topic: "The Driver's Guide to Stable Blood Sugar",
    format: "document",
    exportAs: "pdf",
    numCards: 12,
    audience: "Professional truck drivers who struggle with energy levels, weight, and blood sugar issues while living on the road",
    tone: "Friendly, authoritative, and practical. Use trucking industry language. Be direct like talking to a fellow driver.",
    outline: [
      {
        title: "Introduction: The Blood Sugar Crisis on the Road",
        content: "Why truck drivers are 2x more likely to develop diabetes. The hidden costs of unstable blood sugar - fatigue, brain fog, weight gain, and safety risks."
      },
      {
        title: "Truck Stop Food Traps",
        content: "The 10 worst foods at truck stops that spike your blood sugar. Hidden sugars in 'healthy' options. Why that energy drink is making things worse."
      },
      {
        title: "5 Warning Signs of Pre-Diabetes",
        content: "Signs you might already have blood sugar problems: afternoon crashes, constant hunger, belly fat that won't budge, waking up tired, brain fog while driving."
      },
      {
        title: "What to Eat at Pilot/Flying J",
        content: "The best low-glycemic options at Pilot and Flying J. Specific items to grab. What to avoid. Sample meal combinations."
      },
      {
        title: "What to Eat at Love's Travel Stops",
        content: "Smart choices at Love's. The salad bar strategy. Best hot food options. Snacks that stabilize instead of spike."
      },
      {
        title: "What to Eat at TA/Petro",
        content: "TA and Petro-specific recommendations. Iron Skillet ordering tips. Country Pride best bets. Portable options for the cab."
      },
      {
        title: "Emergency Blood Sugar Fixes",
        content: "What to do when you're crashing behind the wheel. Quick fixes you can keep in your truck. The 15-minute protocol to stabilize."
      },
      {
        title: "The 7-Day Blood Sugar Reset Protocol",
        content: "Day-by-day plan to reset your blood sugar sensitivity. Simple swaps that make a huge difference. What to expect each day."
      },
      {
        title: "Supplements That Actually Work",
        content: "Evidence-based supplements for blood sugar: berberine, chromium, magnesium, cinnamon. What to buy, dosages, when to take them."
      },
      {
        title: "Meal Prep for the Road",
        content: "Simple meals you can prep at home. What cooler to buy. Foods that last. No-cook options. Reheating strategies."
      },
      {
        title: "The 30-Day Action Plan",
        content: "Week-by-week implementation guide. Start with the easiest wins. Build sustainable habits. Track your progress."
      },
      {
        title: "Next Steps: Join the Community",
        content: "Get support from other health-focused drivers. Free resources at LetsTruck.com. How to get personalized coaching."
      }
    ],
    style: {
      theme: "professional",
      colors: ["#FF4500", "#1A1A1A", "#F4A300"],
    },
    branding: {
      companyName: "Let's Truck Health Coaching",
      website: "https://letstruck.com",
    }
  };

  const generationId = await startGeneration(payload);
  process.stdout.write("  Generating");
  const result = await pollGeneration(generationId);
  console.log("\n  ✓ PDF Lead Magnet completed!");
  
  return result;
}

/**
 * Generate the Landing Page
 */
async function generateLandingPage(): Promise<GenerationResponse> {
  console.log("\n🌐 Generating Landing Page: \"Why You're Exhausted by 2pm\"");

  const payload = {
    topic: "Lead Magnet Landing Page - Blood Sugar Guide for Truck Drivers",
    format: "webpage",
    numCards: 6,
    audience: "Truck drivers who are tired of feeling exhausted, gaining weight, and struggling with energy",
    tone: "Urgent, empathetic, solution-focused. Speak directly to their pain.",
    outline: [
      {
        title: "Hero Section",
        content: `
          Headline: Why You're Exhausted by 2pm (And What to Do About It)
          
          Subheadline: The free guide trucking companies don't want you to read
          
          Body: You know the feeling. Hit the road at 6am, feeling okay. By 2pm, you're fighting to keep your eyes open. Reaching for another energy drink. Wondering why you're always tired no matter how much you sleep.
          
          It's not your fault. And it's not about sleeping more.
          
          CTA Button: Get My Free Guide
        `
      },
      {
        title: "The Problem",
        content: `
          The Real Reason You Can't Lose Weight or Stay Awake
          
          - Truck stop food is designed to spike your blood sugar (then crash it)
          - Every crash makes you hungrier and more tired
          - Your body is stuck in a vicious cycle
          - The more you try to "eat less," the worse it gets
          
          But there's a simple fix that has nothing to do with willpower.
        `
      },
      {
        title: "Benefits - What You'll Learn",
        content: `
          Inside This Free Guide, You'll Discover:
          
          ✓ The 5 warning signs you're heading toward pre-diabetes (most drivers have at least 3)
          
          ✓ Exactly what to order at Pilot, Love's, and TA that won't spike your blood sugar
          
          ✓ The emergency protocol when you're crashing behind the wheel
          
          ✓ A 7-day reset that drivers say "changed everything"
          
          ✓ The supplements that actually work (and which ones are a waste of money)
        `
      },
      {
        title: "Social Proof",
        content: `
          What Drivers Are Saying:
          
          "I lost 23 pounds in 2 months without ever feeling hungry. Wish I'd found this years ago." - Mike R., OTR driver, 15 years
          
          "I used to need 3 Red Bulls a day. Now I don't need any. My wife says I'm a different person." - James T., team driver
          
          "Finally someone who understands what it's like out here. This actually works for our lifestyle." - Sarah K., flatbed driver
        `
      },
      {
        title: "About / Trust",
        content: `
          From a Driver Who's Been There
          
          This guide was created by Kevin Rutherford and the Let's Truck team - people who actually understand life on the road.
          
          Kevin has helped thousands of drivers reclaim their health without giving up their career.
          
          No gym membership required. No cooking fancy meals in your cab. Just practical strategies that work.
        `
      },
      {
        title: "Final CTA",
        content: `
          Get Your Free Guide Now
          
          Stop fighting your body. Start working with it.
          
          Enter your email below and get instant access to "The Driver's Guide to Stable Blood Sugar" - the 12-page guide that's helping drivers feel better, lose weight, and stay alert all day.
          
          [Email Input Field]
          
          CTA Button: Send Me the Free Guide
          
          Small text: We respect your privacy. Unsubscribe anytime.
        `
      }
    ],
    style: {
      theme: "modern",
      colors: ["#FF4500", "#0D0D0D", "#F4A300", "#FFFFFF"],
    },
    branding: {
      companyName: "Let's Truck Health Coaching",
      website: "https://letstruck.com",
      logo: "https://letstruck.com/logo.png"
    }
  };

  const generationId = await startGeneration(payload);
  process.stdout.write("  Generating");
  const result = await pollGeneration(generationId);
  console.log("\n  ✓ Landing Page completed!");
  
  return result;
}

/**
 * Main execution
 */
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  🚛 BLOOD SUGAR CAMPAIGN ASSET GENERATOR");
  console.log("  Generating assets via Gamma API");
  console.log("═══════════════════════════════════════════════════════════════");

  try {
    // Generate PDF Lead Magnet
    const pdfResult = await generatePDFLeadMagnet();
    
    // Generate Landing Page
    const landingPageResult = await generateLandingPage();

    // Print results
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  ✅ ALL ASSETS GENERATED SUCCESSFULLY!");
    console.log("═══════════════════════════════════════════════════════════════");
    
    console.log("\n📄 PDF Lead Magnet:");
    console.log(`   Gamma URL: ${pdfResult.gammaUrl || "Not available"}`);
    console.log(`   PDF URL:   ${pdfResult.pdfUrl || "Not available"}`);
    
    console.log("\n🌐 Landing Page:");
    console.log(`   Gamma URL: ${landingPageResult.gammaUrl || "Not available"}`);
    
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  Next steps:");
    console.log("  1. Review and edit the assets in Gamma");
    console.log("  2. Download the PDF and upload to your hosting");
    console.log("  3. Publish the landing page or export HTML");
    console.log("  4. Connect to your email marketing system");
    console.log("═══════════════════════════════════════════════════════════════\n");

  } catch (error) {
    console.error("\n❌ Error generating assets:", error);
    process.exit(1);
  }
}

// Run the script
main();

