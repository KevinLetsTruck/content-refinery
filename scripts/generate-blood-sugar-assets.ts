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
      "X-API-KEY": GAMMA_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to start generation: ${response.status} ${error}`);
  }

  const data = await response.json();
  console.log(`  Response:`, JSON.stringify(data, null, 2));
  
  const generationId = data.id || data.generationId || data.generation_id;
  console.log(`  ✓ Generation started with ID: ${generationId}`);
  return generationId;
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
        "X-API-KEY": GAMMA_API_KEY,
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

  const inputText = `
# The Driver's Guide to Stable Blood Sugar

Create a comprehensive 12-page PDF guide for professional truck drivers about managing blood sugar on the road.

## Target Audience
Professional truck drivers who struggle with energy levels, weight, and blood sugar issues while living on the road.

## Tone & Style
Friendly, authoritative, and practical. Use trucking industry language. Be direct like talking to a fellow driver. No medical jargon.

## Sections to Include:

### 1. Introduction: The Blood Sugar Crisis on the Road
Why truck drivers are 2x more likely to develop diabetes. The hidden costs of unstable blood sugar - fatigue, brain fog, weight gain, and safety risks.

### 2. Truck Stop Food Traps
The 10 worst foods at truck stops that spike your blood sugar. Hidden sugars in 'healthy' options. Why that energy drink is making things worse.

### 3. 5 Warning Signs of Pre-Diabetes
Signs you might already have blood sugar problems: afternoon crashes, constant hunger, belly fat that won't budge, waking up tired, brain fog while driving.

### 4. What to Eat at Pilot/Flying J
The best low-glycemic options at Pilot and Flying J. Specific items to grab. What to avoid. Sample meal combinations.

### 5. What to Eat at Love's Travel Stops
Smart choices at Love's. The salad bar strategy. Best hot food options. Snacks that stabilize instead of spike.

### 6. What to Eat at TA/Petro
TA and Petro-specific recommendations. Iron Skillet ordering tips. Country Pride best bets. Portable options for the cab.

### 7. Emergency Blood Sugar Fixes
What to do when you're crashing behind the wheel. Quick fixes you can keep in your truck. The 15-minute protocol to stabilize.

### 8. The 7-Day Blood Sugar Reset Protocol
Day-by-day plan to reset your blood sugar sensitivity. Simple swaps that make a huge difference. What to expect each day.

### 9. Supplements That Actually Work
Evidence-based supplements for blood sugar: berberine, chromium, magnesium, cinnamon. What to buy, dosages, when to take them.

### 10. Meal Prep for the Road
Simple meals you can prep at home. What cooler to buy. Foods that last. No-cook options. Reheating strategies.

### 11. The 30-Day Action Plan
Week-by-week implementation guide. Start with the easiest wins. Build sustainable habits. Track your progress.

### 12. Next Steps: Join the Community
Get support from other health-focused drivers. Free resources at LetsTruck.com. How to get personalized coaching.

## Branding
- Company: Let's Truck Health Coaching
- Website: https://letstruck.com
- Colors: Orange (#FF4500), Black (#1A1A1A), Gold (#F4A300)
`;

  const payload = {
    inputText: inputText,
    textMode: "generate",
    format: "document",
    numCards: 12,
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

  const inputText = `
# Lead Magnet Landing Page - Blood Sugar Guide for Truck Drivers

Create a high-converting landing page for a free PDF guide about blood sugar management for truck drivers.

## Target Audience
Truck drivers who are tired of feeling exhausted, gaining weight, and struggling with energy.

## Tone
Urgent, empathetic, solution-focused. Speak directly to their pain.

## Page Structure:

### Hero Section
**Headline:** Why You're Exhausted by 2pm (And What to Do About It)

**Subheadline:** The free guide trucking companies don't want you to read

**Body:** You know the feeling. Hit the road at 6am, feeling okay. By 2pm, you're fighting to keep your eyes open. Reaching for another energy drink. Wondering why you're always tired no matter how much you sleep.

It's not your fault. And it's not about sleeping more.

**CTA Button:** Get My Free Guide

### The Problem Section
**Headline:** The Real Reason You Can't Lose Weight or Stay Awake

- Truck stop food is designed to spike your blood sugar (then crash it)
- Every crash makes you hungrier and more tired
- Your body is stuck in a vicious cycle
- The more you try to "eat less," the worse it gets

But there's a simple fix that has nothing to do with willpower.

### Benefits Section
**Headline:** Inside This Free Guide, You'll Discover:

✓ The 5 warning signs you're heading toward pre-diabetes (most drivers have at least 3)

✓ Exactly what to order at Pilot, Love's, and TA that won't spike your blood sugar

✓ The emergency protocol when you're crashing behind the wheel

✓ A 7-day reset that drivers say "changed everything"

✓ The supplements that actually work (and which ones are a waste of money)

### Testimonials Section
**Headline:** What Drivers Are Saying:

"I lost 23 pounds in 2 months without ever feeling hungry. Wish I'd found this years ago." - Mike R., OTR driver, 15 years

"I used to need 3 Red Bulls a day. Now I don't need any. My wife says I'm a different person." - James T., team driver

"Finally someone who understands what it's like out here. This actually works for our lifestyle." - Sarah K., flatbed driver

### About Section
**Headline:** From a Driver Who's Been There

This guide was created by Kevin Rutherford and the Let's Truck team - people who actually understand life on the road.

Kevin has helped thousands of drivers reclaim their health without giving up their career.

No gym membership required. No cooking fancy meals in your cab. Just practical strategies that work.

### Final CTA Section
**Headline:** Get Your Free Guide Now

Stop fighting your body. Start working with it.

Enter your email below and get instant access to "The Driver's Guide to Stable Blood Sugar" - the 12-page guide that's helping drivers feel better, lose weight, and stay alert all day.

**CTA Button:** Send Me the Free Guide

*We respect your privacy. Unsubscribe anytime.*

## Branding
- Company: Let's Truck Health Coaching
- Website: https://letstruck.com
- Colors: Orange (#FF4500), Black (#0D0D0D), Gold (#F4A300), White (#FFFFFF)
`;

  const payload = {
    inputText: inputText,
    textMode: "generate",
    format: "webpage",
    numCards: 6,
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

