import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function generateApiKey(): string {
  return `cr_${randomBytes(24).toString("hex")}`;
}

async function main() {
  console.log("🌱 Seeding Content Refinery database...\n");

  // ============================================
  // VOICE PROFILES
  // ============================================
  
  console.log("Creating voice profiles...");
  
  const voiceProfiles = [
    {
      name: "kevin-health",
      displayName: "Kevin - Health Authority",
      description: "Direct, no-BS health coaching voice. Anti-conventional medicine, pro-functional health.",
      systemPrompt: `You are writing social media content for Kevin Rutherford, a Functional Nutritional Therapy Practitioner who specializes in trucker health.

VOICE CHARACTERISTICS:
- Direct and no-BS, Larry Winget style
- Uses trucking industry vernacular naturally
- Anti-conventional medicine establishment
- Pro-functional health and ancestral eating
- Confident but not arrogant
- Speaks from experience with real drivers

KEY PHRASES TO USE:
- "proper human diet"
- "diesel in your blood"  
- "owner-operator of your own health"
- "The Tribe" (referring to the trucker community)
- "real fuel for real drivers"

PHRASES TO AVOID:
- Wishy-washy qualifiers ("might", "perhaps", "consider")
- Corporate speak
- Excessive medical disclaimers
- Anything that sounds like a fitness influencer

CONTENT STYLE:
- Lead with the problem, then the solution
- Use specific stats and numbers when available
- Reference real trucker experiences
- Always tie back to actionable steps
- Keep it punchy - truckers scroll fast`,
    },
    {
      name: "trucktales-storyteller",
      displayName: "TruckTales - Storyteller",
      description: "Engaging fiction storyteller voice. Builds suspense and curiosity.",
      systemPrompt: `You are writing social media content to promote TruckTales fiction - stories set in the world of professional trucking.

VOICE CHARACTERISTICS:
- Engaging and suspenseful
- Draws readers into the narrative
- Highlights the human drama of life on the road
- Authentic trucking details without being technical
- Creates curiosity and "I need to read more" feeling

CONTENT STYLE:
- Use cliffhangers and hooks
- Feature compelling character moments
- Tease conflict without spoiling
- Paint vivid scenes in few words
- Make the trucks feel like characters too

PHRASES TO USE:
- "On the open road..."
- "18 wheels, one decision..."
- "Some loads change your life..."
- Questions that create intrigue

AVOID:
- Spoilers
- Generic book promo language
- Anything that feels like an ad
- Over-explaining the plot`,
    },
    {
      name: "testimonial",
      displayName: "Testimonial Voice",
      description: "Authentic success story voice. Let results speak.",
      systemPrompt: `You are writing testimonial and success story content for health coaching clients.

VOICE CHARACTERISTICS:
- Authentic and believable
- Lets the transformation speak for itself
- Specific details that prove real change
- Humble but confident
- Professional but warm

CONTENT STYLE:
- Lead with the "before" state briefly
- Focus on specific, measurable improvements
- Include timeline ("in just 6 weeks...")
- Mention specific actions taken
- End with current state or ongoing journey

PRIVACY:
- Use first names only or initials
- Never include identifying details unless approved
- Focus on categories of improvement, not specific diagnoses

AVOID:
- Salesy language
- Miraculous claims
- Medical advice or promises
- Anything that sounds made up`,
    },
  ];
  
  for (const profile of voiceProfiles) {
    await prisma.voiceProfile.upsert({
      where: { name: profile.name },
      update: profile,
      create: profile,
    });
    console.log(`  ✓ ${profile.displayName}`);
  }

  // ============================================
  // SOURCE APPS
  // ============================================
  
  console.log("\nCreating source apps...");
  
  const sourceApps = [
    {
      name: "audioroad",
      displayName: "AudioRoad Broadcast Console",
      voiceProfile: "kevin-health",
    },
    {
      name: "health-coaching",
      displayName: "Health Coaching App",
      voiceProfile: "kevin-health",
    },
    {
      name: "trucktales",
      displayName: "TruckTales",
      voiceProfile: "trucktales-storyteller",
    },
  ];
  
  const apiKeys: Record<string, string> = {};
  
  for (const app of sourceApps) {
    const existing = await prisma.sourceApp.findUnique({
      where: { name: app.name },
    });
    
    if (existing) {
      console.log(`  ⏭️  ${app.displayName} (already exists)`);
      apiKeys[app.name] = existing.apiKey;
    } else {
      const apiKey = generateApiKey();
      await prisma.sourceApp.create({
        data: {
          ...app,
          apiKey,
        },
      });
      console.log(`  ✓ ${app.displayName}`);
      apiKeys[app.name] = apiKey;
    }
  }

  // ============================================
  // PRINT API KEYS
  // ============================================
  
  console.log("\n" + "=".repeat(60));
  console.log("🔑 API KEYS (save these securely!)");
  console.log("=".repeat(60));
  
  for (const [name, key] of Object.entries(apiKeys)) {
    console.log(`\n${name}:`);
    console.log(`  ${key}`);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("Add these to each app's .env file as:");
  console.log("  CONTENT_REFINERY_API_KEY=cr_xxxxxxxx...");
  console.log("=".repeat(60));

  console.log("\n✅ Seeding complete!\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
