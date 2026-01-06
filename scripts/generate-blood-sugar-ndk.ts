#!/usr/bin/env npx ts-node

/**
 * Generate Blood Sugar NDK Protocol PDF via Gamma API
 * 
 * Run with: npx ts-node scripts/generate-blood-sugar-ndk.ts
 */

const GAMMA_API_KEY = "sk-gamma-r8dhxiQCmvlhx2ju5ZKNWIGtclWIJnV1WZEqbmskCE";
const GAMMA_BASE_URL = "https://public-api.gamma.app/v1.0";

interface GenerationResponse {
  id?: string;
  generationId?: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  gammaUrl?: string;
  pdfUrl?: string;
  error?: string;
}

const NDK_CONTENT = `# The Driver's Guide to Stable Blood Sugar
## The NDK Protocol: Stop the Crashes, Brain Fog, and Weight Gain

---

## Introduction: What You've Been Told Is Wrong

If you're a truck driver dealing with afternoon crashes, brain fog, or weight that won't budge — everything you've been told about "healthy eating" is probably making it worse.

Salads with seed oil dressing. Whole grain bread. Fruit smoothies. Oatmeal for breakfast.

This is NOT health food. It's metabolic poison dressed up in good marketing.

Truck drivers are 3x more likely to develop Type 2 diabetes. 69% are obese. 1 in 3 is pre-diabetic without knowing it.

This guide is different. It's based on ancestral eating — how humans ate for millions of years before chronic disease became normal. It's the NDK Protocol: Nutrient Dense Keto.

High fat. Animal-based. Very low carb. And it works.

---

## Chapter 1: Why Drivers Are Set Up to Fail

The trucking lifestyle creates a perfect storm for metabolic dysfunction:

**Limited Food Options:** Truck stop food is engineered for profit, not health. High-carb, high-sugar options dominate because they're cheap and addictive.

**Seed Oils Everywhere:** Every fried food, every salad dressing, every "healthy" option is cooked in soybean, canola, or vegetable oil. These oils cause inflammation and metabolic damage.

**Irregular Meal Timing:** Delivery schedules dictate when you eat. This disrupts your body's insulin rhythms.

**Sedentary Hours:** Sitting 10+ hours means your muscles aren't pulling glucose from your blood.

**Poor Sleep:** Irregular sleep destroys insulin sensitivity. One bad night can make you temporarily pre-diabetic.

The system is rigged. But once you understand what's happening, you can beat it.

---

## Chapter 2: The 5 Warning Signs You're Pre-Diabetic

Most drivers have 3+ of these and don't know what they mean:

**1. Exhausted After Meals**
Not just full — completely wiped out. This is your body struggling to process a massive blood sugar spike.

**2. Constant Thirst**
Drinking water but never satisfied. High blood sugar makes your kidneys work overtime.

**3. Brain Fog by Afternoon**
Can't focus, can't think clearly. Your brain runs on stable glucose — wild swings kill your cognition.

**4. Weight That Won't Budge**
Eating less but not losing. High insulin tells your body to STORE fat, not burn it.

**5. Waking Up Tired**
Even after 8 hours. Poor blood sugar regulation destroys sleep quality.

If you have 3+ of these, your metabolism is broken. The good news: it's fixable.

---

## Chapter 3: The NDK Protocol

NDK = Nutrient Dense Keto

This is NOT a diet. It's how humans are designed to eat.

**The Framework:**
- 70-80% of calories from FAT
- 20-25% from PROTEIN  
- Less than 5-10% from CARBS

**Why High Fat?**
Fat is your body's preferred fuel source. When you burn fat instead of sugar, you get:
- Stable energy all day (no crashes)
- Mental clarity (no brain fog)
- Natural appetite control (no constant hunger)
- Weight loss without trying

**The Foundation: Animal Foods**
- Beef (especially grass-fed) — ribeye, ground beef, roasts
- Pork — bacon, pork belly, chops
- Eggs — whole eggs, don't fear the yolk
- Lamb, duck, organ meats
- Wild-caught seafood — salmon, sardines, shrimp

**Quality Fats:**
- Beef tallow, lard, bacon grease
- Butter (grass-fed preferred)
- Ghee

**Dairy (Quality Matters):**
- Raw A2 dairy is ideal but hard to find
- Alexandre Farms A2 — best practical option for drivers
- Full-fat cheese, heavy cream, sour cream
- AVOID: conventional milk, low-fat dairy, A1 dairy

---

## Chapter 4: Foods to AVOID (This Will Surprise You)

**NEVER Eat:**
- Seed oils (soybean, canola, corn, vegetable, sunflower) — THE REAL VILLAIN
- Sugar in all forms
- All grains (wheat, corn, rice, oats) — yes, including "whole grains"
- Bread, pasta, cereal — even "healthy" versions
- Legumes (beans, lentils, peanuts)
- Soy products
- Processed foods

**Avoid Until Metabolically Healthy:**
- ALL fruit — yes, all of it
- Most vegetables — phytates, oxalates, and lectins cause problems
- Anything starchy

**"Health Foods" That Aren't:**
- Oatmeal — high carb, contains anti-nutrients
- Whole grain bread — still spikes blood sugar
- Fruit juice — liquid sugar
- Smoothies — usually sugar bombs
- Salads — the dressing is seed oil, croutons are carbs
- Low-fat anything — usually higher sugar
- Plant-based meat — processed garbage

---

## Chapter 5: Truck Stop Survival Guide (NDK Protocol)

### Pilot/Flying J
**Best Options:**
- Hard boiled eggs (grab 3-4)
- Pork rinds (zero carb, solid fat)
- Cheese sticks / string cheese
- Deli meat (check for no sugar added)
- Beef jerky (check ingredients — avoid sugar/soy)
- Hot dogs no bun — not ideal but works

**SKIP:**
- Salads (seed oil dressing)
- Anything breaded
- All sandwiches
- Pastries, donuts, muffins

### Love's
**Best Options:**
- Hardee's/Carl's Jr: Any burger, NO BUN, no sauce
- Godfather's Pizza: Scrape toppings, eat meat and cheese only
- Chester's chicken: Remove breading, eat the meat
- Grab-and-go: eggs, cheese, pork rinds

### TA/Petro (Iron Skillet)
**Best Options:**
- Eggs any style with bacon and sausage
- Steak — no sides, or ask for extra meat instead
- Burger patties no bun

**Ask For:**
- Extra butter (real butter)
- Meat instead of hash browns
- No bread/toast

### Fast Food (Emergency Options)
**McDonald's:** Sausage patties (just the meat), burger patties no bun
**Wendy's:** Baconator no bun, any burger bunless no sauce
**Five Guys:** Burger bowl, extra bacon, extra cheese

---

## Chapter 6: The 7-Day NDK Reset

This protocol resets your metabolism and identifies food sensitivities.

**Days 1-3: Elimination**
- Eat ONLY: beef, eggs, salt, water
- No dairy, no spices, no vegetables
- This is temporary — it identifies sensitivities
- Expect: possible fatigue, headaches (carb withdrawal is real)
- Push through — it passes

**Days 4-5: Add Fats**
- Continue: beef, eggs
- Add: butter, bacon, pork belly
- Add: bone broth (electrolytes!)
- Increase salt intake — this is critical
- Energy should start improving

**Days 6-7: Expand Proteins**
- Add: other meats (pork, lamb, chicken thighs)
- Add: seafood (salmon, shrimp, sardines)
- Add: quality dairy if tolerated (A2 preferred)
- Add: cheese
- By now: energy stabilizing, cravings disappearing

**Week 2 and Beyond:**
- Stay in NDK framework: 70-80% fat
- Add Tier 2 foods if tolerated
- No fruit until A1C under 5.4
- No vegetables unless you specifically want them (they're not required)

---

## Chapter 7: Electrolytes — The Missing Piece

Most people who "fail" at keto are actually just low on electrolytes.

When you cut carbs, your kidneys flush sodium. You MUST replace it.

**Daily Targets:**
- Sodium: 4,000-7,000mg (yes, really — add salt to everything)
- Potassium: 3,000-4,000mg
- Magnesium: 400-600mg

**Symptoms of Low Electrolytes:**
- Fatigue, weakness
- Headaches
- Muscle cramps
- Dizziness
- "Keto flu"

**Solutions:**
- Salt your food liberally
- Drink bone broth
- Take magnesium glycinate before bed
- Use electrolyte supplements (no sugar)

---

## Chapter 8: Supplements That Actually Work

**Recommended:**
- Electrolytes (sodium, potassium, magnesium) — NON-NEGOTIABLE
- Beef liver capsules (if not eating organ meats)
- Vitamin D3 + K2 (drivers don't get enough sun)
- Omega-3 fish oil (high quality only)
- Magnesium glycinate (sleep, cramps, mood)

**For Blood Sugar Specifically:**
- Berberine — as effective as some medications in studies
- Chromium — supports insulin sensitivity
- Apple cider vinegar before meals — blunts glucose spikes

**AVOID:**
- Most multivitamins (cheap, poorly absorbed)
- Synthetic B vitamins
- Calcium supplements (get from dairy/bones)
- Fiber supplements (not needed — you won't be constipated)

---

## Chapter 9: Common Objections Handled

**"But I need fiber for digestion"**
No, you don't. Fiber is not essential. Many people digest BETTER without it. Animal foods are highly digestible. If you're constipated, it's usually low electrolytes or low fat — not low fiber.

**"Red meat causes heart disease"**
This is based on flawed 1960s studies that have been debunked. Saturated fat from whole foods does not cause heart disease. Seed oils and sugar do. The healthiest populations eat tons of animal fat.

**"This is too expensive"**
Ground beef and eggs are some of the cheapest foods per calorie. You eat LESS volume when food is nutrient-dense. You save money on snacks, energy drinks, and eventually medical bills.

**"I can't find good food on the road"**
Every single truck stop has eggs, pork rinds, and cheese. Every fast food place will give you a burger without the bun. It's not hard — it's just different.

**"I'll miss bread/pasta/sweets"**
For about 2-3 weeks. Then the cravings disappear completely. Your taste buds literally change. Former carb addicts become disgusted by their old foods. Trust the process.

---

## Chapter 10: Your 30-Day Action Plan

**Week 1: Elimination**
□ Remove all seed oils from your diet
□ Stop eating grains (bread, pasta, cereal)
□ Cut out sugar completely
□ Start reading ingredient labels

**Week 2: The Reset**
□ Do the 7-day NDK reset (beef, eggs, salt, water → expand)
□ Get your electrolytes dialed in
□ Push through the transition — it gets easier

**Week 3: Truck Stop Mastery**
□ Know exactly what to order at Pilot, Love's, TA
□ Keep emergency food in your truck (pork rinds, jerky, cheese)
□ Practice ordering burgers without buns

**Week 4: Optimize**
□ Add supplements if needed (berberine, magnesium, D3)
□ Track how you feel — energy, sleep, focus
□ Weigh yourself (but don't obsess — how you feel matters more)

---

## What's Next

This guide is your starting point. But knowledge without community is hard to sustain.

**Download the AudioRoad App**
Daily health tips delivered while you drive. Hundreds of episodes on driver health, wealth, and business. Free.

**Join the Let's Truck Tribe**
The serious drivers who are done with the BS. Deep-dive content, direct access, drivers helping drivers. This is where transformation happens.

**Check the Shop**
Quality supplements that actually work. Berberine, electrolytes, and more — vetted by drivers, for drivers.

You're not alone out here. 4,000+ drivers are on this journey.

Let's go.

— Kevin Rutherford
Host, Let's Truck`;

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
  const generationId = data.id || data.generationId || data.generation_id;
  console.log(`  ✓ Generation started with ID: ${generationId}`);
  return generationId;
}

/**
 * Poll for generation completion
 */
async function pollGeneration(generationId: string): Promise<GenerationResponse> {
  const maxAttempts = 120; // 6 minutes max (longer doc)
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

  throw new Error("Generation timed out after 6 minutes");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate the NDK Blood Sugar PDF
 */
async function generateNDKPDF(): Promise<GenerationResponse> {
  console.log("\n📄 Generating NDK Blood Sugar PDF Guide...");

  const payload = {
    inputText: NDK_CONTENT,
    textMode: "preserve",
    format: "document",
    exportAs: "pdf",
    numCards: 12,
    additionalInstructions: `
      Create a professional, authoritative PDF guide.
      This challenges conventional nutrition advice — make that clear in the design.
      Use bold headers, clear sections, bullet points for lists.
      Tone: Confident, slightly rebellious, backed by logic.
      This is NOT mainstream health advice — it's better.
      Make truck stop sections very scannable — drivers will reference these.
      End with strong CTAs for AudioRoad app and Let's Truck Tribe.
      Brand colors: Orange (#FF4500), Black (#1A1A1A), Gold (#F4A300)
    `,
    textOptions: {
      amount: "detailed",
      tone: "authoritative, challenging conventional wisdom, practical, no-nonsense",
      audience: "truck drivers and owner-operators who are fed up with mainstream health advice that doesn't work",
      language: "en"
    },
    imageOptions: {
      source: "aiGenerated",
      model: "imagen-4-pro",
      style: "photorealistic"
    }
  };

  const generationId = await startGeneration(payload);
  process.stdout.write("  Generating");
  const result = await pollGeneration(generationId);
  console.log("\n  ✓ NDK PDF completed!");
  
  return result;
}

/**
 * Main execution
 */
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  🥩 NDK BLOOD SUGAR PDF GENERATOR");
  console.log("  Nutrient Dense Keto Protocol");
  console.log("═══════════════════════════════════════════════════════════════");

  try {
    const result = await generateNDKPDF();

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  ✅ PDF GENERATED SUCCESSFULLY!");
    console.log("═══════════════════════════════════════════════════════════════");
    
    console.log("\n📄 NDK Blood Sugar Guide:");
    console.log(`   Gamma URL: ${result.gammaUrl || "Not available"}`);
    console.log(`   PDF URL:   ${result.pdfUrl || "Not available"}`);
    
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  Next steps:");
    console.log("  1. Review and edit in Gamma: " + (result.gammaUrl || ""));
    console.log("  2. Download PDF and upload to hosting");
    console.log("  3. Update campaigns/blood-sugar-guide.json with new URL");
    console.log("  4. Update email sequence download links");
    console.log("═══════════════════════════════════════════════════════════════\n");

  } catch (error) {
    console.error("\n❌ Error generating PDF:", error);
    process.exit(1);
  }
}

// Run the script
main();

