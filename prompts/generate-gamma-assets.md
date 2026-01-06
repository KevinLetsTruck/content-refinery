# Generate Blood Sugar Campaign Assets via Gamma API

## Context
We have a Gamma API integration at `src/lib/gamma.ts` and need to generate assets for the Blood Sugar campaign. The Gamma API key is: `sk-gamma-r8dhxiQCmvlhx2ju5ZKNWIGtclWIJnV1WZEqbmskCE`

## Task
Create a Node.js script at `scripts/generate-blood-sugar-assets.ts` that:

1. Generates a **PDF Lead Magnet** called "The Driver's Guide to Stable Blood Sugar" with these sections:
   - Why Drivers Are 3x More Likely to Have Blood Sugar Problems
   - The Truck Stop Trap: Foods That Spike and Crash You
   - The 5 Warning Signs You're Already Pre-Diabetic
   - The Driver's Plate: What to Eat at Every Stop (Pilot, Love's, TA)
   - Emergency Fixes: What to Do When You're Crashing
   - The 7-Day Blood Sugar Reset Protocol
   - Supplements That Actually Work (And Which Are Scams)
   - Your 30-Day Action Plan
   
   Target audience: Truck drivers and owner-operators
   Tone: Friendly, authoritative, practical, no-nonsense
   Export as: PDF
   Pages: 10-12 cards

2. Generates a **Landing Page** with:
   - Headline: "Why You're Exhausted by 2pm (And What to Do About It)"
   - Subheadline: "The free guide trucking companies don't want you to read"
   - Benefits list (5 bullet points about what they'll learn)
   - CTA: "Get My Free Guide"
   - Trust elements: "Join 4,000+ drivers", "Created by Kevin Rutherford"

## Gamma API Details

Base URL: `https://public-api.gamma.app/v1.0`

**Generate endpoint:** POST `/generations`
```json
{
  "inputText": "Your content here",
  "format": "document" | "webpage",
  "textMode": "generate",
  "exportAs": "pdf",  // only for documents
  "numCards": 10,
  "additionalInstructions": "Instructions for styling",
  "textOptions": {
    "amount": "detailed",
    "tone": "friendly, authoritative",
    "audience": "truck drivers",
    "language": "en"
  },
  "imageOptions": {
    "source": "aiGenerated",
    "model": "imagen-4-pro",
    "style": "photorealistic"
  }
}
```

**Check status:** GET `/generations/{generationId}`

Response when complete:
```json
{
  "generationId": "xxx",
  "status": "completed",
  "gammaUrl": "https://gamma.app/docs/xxx",
  "pdfUrl": "https://..." // if exportAs was pdf
}
```

## Requirements
- Use fetch (built into Node 18+)
- Poll every 3 seconds until complete
- Print URLs when done
- Handle errors gracefully
- Make it runnable with `npx ts-node scripts/generate-blood-sugar-assets.ts`

## After generating
1. Push all code to git
2. Add `GAMMA_API_KEY` to Render environment variables
3. Run the script to generate assets
4. Save the URLs for the campaign
