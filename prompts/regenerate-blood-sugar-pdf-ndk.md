# Regenerate Blood Sugar PDF with NDK Protocol

## Context
The current Blood Sugar PDF at https://gamma.app/docs/uzipvug5gea0dud was generated with generic nutrition advice. We need to regenerate it following Kevin's NDK (Nutrient Dense Keto) protocol.

See `guidelines/nutritional-guidelines.md` for the complete framework.

## Key Differences from Generic Advice

**WRONG (generic):**
- Eat more vegetables and fruits
- Choose whole grains
- Eat salads at truck stops
- Low-fat dairy
- Avoid saturated fat

**CORRECT (NDK Protocol):**
- Animal-based, high-fat (70-80%)
- Very limited vegetables (phytates, oxalates, lectins)
- NO fruit until metabolically healthy
- NO grains ever
- Quality dairy - A2, Alexandre Farms
- Saturated fat is GOOD
- Pork rinds, eggs, cheese, meat at truck stops
- NO salads (seed oil dressings, anti-nutrients)

## Task
Regenerate the PDF Lead Magnet with this content:

**Title:** The Driver's Guide to Stable Blood Sugar
**Subtitle:** Stop the Energy Crashes with the NDK Protocol

### Sections to Include:

**1. Why Drivers Are 3x More Likely to Have Blood Sugar Problems**
- Stats on driver diabetes/obesity
- The system is rigged against you
- Limited options, irregular schedules, sedentary hours

**2. The Truck Stop Trap: What You've Been Told Is Wrong**
- Salads are NOT the answer (seed oils, anti-nutrients)
- "Healthy" options that spike blood sugar
- Why conventional advice fails drivers

**3. The 5 Warning Signs You're Pre-Diabetic**
- Exhausted after meals
- Constant thirst
- Brain fog by afternoon
- Weight won't budge
- Waking up tired

**4. The NDK Protocol: Nutrient Dense Keto**
- 70-80% fat, very low carb
- Animal-based eating
- Why fat is your friend
- Macros explained simply

**5. The Driver's Plate: What to Actually Eat**
At Pilot/Flying J:
- Hard boiled eggs (grab several)
- Pork rinds (zero carb, great fat)
- Cheese sticks
- Deli meat (no sugar added)
- Beef jerky (check ingredients)

At Love's:
- Burger patty no bun
- Chester's chicken (remove breading)
- Eggs, cheese, pork rinds

At TA/Iron Skillet:
- Eggs with bacon/sausage
- Steak, no sides (or extra meat)
- Burger patties no bun
- Ask for: extra butter, meat instead of hash browns

Fast Food Hacks:
- Any burger no bun, no sauce
- Wendy's Baconator bunless
- Five Guys burger bowl

**6. Foods to AVOID (This Will Surprise You)**
- Seed oils (the real villain)
- All grains including "whole grains"
- Most vegetables (for now)
- All fruit (until metabolically healthy)
- Salads (seed oil dressings)
- Oatmeal (it's not healthy)
- Fruit juice and smoothies

**7. The 7-Day NDK Reset Protocol**
Day 1-3: Beef, eggs, salt, water only
Day 4-5: Add butter, bacon, bone broth
Day 6-7: Add other meats, quality dairy (A2)
Week 2+: Maintain NDK, 70-80% fat

**8. Supplements That Actually Work**
Recommended:
- Electrolytes (critical!)
- Berberine (blood sugar)
- Magnesium glycinate
- Vitamin D3 + K2
- Beef liver capsules

Avoid:
- Most multivitamins
- Fiber supplements (not needed)

**9. Handling the Objections**
- "But fiber?" → Not essential, electrolytes matter more
- "Red meat is bad?" → Outdated, seed oils are the problem
- "Too expensive?" → Ground beef and eggs are cheap
- "I'll miss carbs?" → Cravings gone in 2-3 weeks

**10. Your 30-Day Action Plan**
Week 1: Eliminate grains, sugar, seed oils
Week 2: Do the 7-day reset
Week 3: Dial in truck stop meals
Week 4: Add supplements, optimize

**Final CTA:**
- Download AudioRoad app for daily health tips
- Join 4,000+ drivers on this journey
- Check out Let's Truck shop for quality supplements

## Gamma API Call

```javascript
const inputText = `[Paste the full content above, formatted for Gamma]`;

await generate({
  inputText,
  format: "document",
  textMode: "generate",
  exportAs: "pdf",
  numCards: 12,
  additionalInstructions: `
    Create a professional PDF guide. 
    Tone: Authoritative but approachable. Challenge conventional nutrition advice.
    Emphasize: This is different from what you've heard. What you've been told is wrong.
    Include specific truck stop recommendations.
    Make it scannable with clear headers and bullet points.
    End with strong CTA for AudioRoad app.
  `,
  textOptions: {
    amount: "detailed",
    tone: "authoritative, challenging conventional wisdom, practical",
    audience: "truck drivers and owner-operators who are skeptical of mainstream health advice",
    language: "en"
  },
  imageOptions: {
    source: "aiGenerated",
    model: "imagen-4-pro",
    style: "photorealistic"
  }
});
```

## After Generating
1. Review the new PDF
2. Update campaign files with new URL
3. Delete or archive the old generic version
